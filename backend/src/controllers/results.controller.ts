import { Request, Response } from 'express';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';
import { AppError } from '../utils/errorHandler';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import nodemailer from 'nodemailer';
import { env } from '../config/environment';

export const getSessionResults = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const userId = req.user?.id;

  try {
    // Get session details
    const [session]: any = await sequelize.query(
      `SELECT qs.*, q.title as quiz_title, q.total_questions, u.first_name as host_name
       FROM quiz_sessions qs
       JOIN quizzes q ON qs.quiz_id = q.id
       JOIN users u ON qs.host_id = u.id
       WHERE qs.id = $1`,
      {
        bind: [sessionId],
        type: QueryTypes.SELECT,
      }
    );

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    // Check if user has access to results
    if (session.host_id !== userId && req.user?.role !== 'admin') {
      throw new AppError('Unauthorized to view these results', 403);
    }

    // Get participants and their responses
    const participants = await sequelize.query(
      `SELECT 
        sp.id,
        sp.nickname as name,
        sp.email,
        sp.score,
        sp.completed_at,
        ROUND((sp.score::numeric / q.total_questions) * 100, 1) as percentage,
        EXTRACT(EPOCH FROM (sp.completed_at - sp.joined_at)) as time_spent
       FROM session_participants sp
       JOIN quiz_sessions qs ON sp.session_id = qs.id
       JOIN quizzes q ON qs.quiz_id = q.id
       WHERE sp.session_id = $1
       ORDER BY sp.score DESC, sp.completed_at ASC`,
      {
        bind: [sessionId],
        type: QueryTypes.SELECT,
      }
    );

    // Get all responses with question details
    const responses = await sequelize.query(
      `SELECT 
        sr.participant_id,
        sr.question_id,
        sr.question_index,
        sr.selected_answer,
        sr.is_correct,
        sr.time_spent,
        qq.question_text,
        qq.correct_answer,
        qq.options
       FROM session_responses sr
       JOIN quiz_questions qq ON sr.question_id = qq.id
       WHERE sr.session_id = $1
       ORDER BY sr.participant_id, sr.question_index`,
      {
        bind: [sessionId],
        type: QueryTypes.SELECT,
      }
    );

    // Get question statistics
    const questionStats = await sequelize.query(
      `SELECT 
        qq.id,
        qq.question_text as text,
        qq.question_type as type,
        qq.correct_answer,
        qq.options,
        COUNT(CASE WHEN sr.is_correct = true THEN 1 END) as correct_count,
        COUNT(CASE WHEN sr.is_correct = false THEN 1 END) as incorrect_count,
        COUNT(CASE WHEN sr.selected_answer IS NULL THEN 1 END) as skipped_count,
        AVG(sr.time_spent) as average_time
       FROM quiz_questions qq
       LEFT JOIN session_responses sr ON qq.id = sr.question_id AND sr.session_id = $1
       WHERE qq.quiz_id = $2
       GROUP BY qq.id, qq.question_order
       ORDER BY qq.question_order`,
      {
        bind: [sessionId, session.quiz_id],
        type: QueryTypes.SELECT,
      }
    );

    // Calculate statistics
    const scores = (participants as any[]).map(p => p.percentage);
    const statistics = {
      averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      totalParticipants: participants.length,
      completionRate: participants.length > 0 
        ? ((participants as any[]).filter(p => p.completed_at).length / participants.length) * 100 
        : 0,
    };

    // Group responses by participant
    const participantResponses: any = {};
    (responses as any[]).forEach(response => {
      if (!participantResponses[response.participant_id]) {
        participantResponses[response.participant_id] = [];
      }
      participantResponses[response.participant_id].push({
        questionId: response.question_id,
        questionIndex: response.question_index,
        selectedAnswer: response.selected_answer,
        isCorrect: response.is_correct,
        timeSpent: response.time_spent,
      });
    });

    // Add responses to participants
    const participantsWithResponses = (participants as any[]).map(participant => ({
      ...participant,
      responses: participantResponses[participant.id] || [],
    }));

    // Format questions for response
    const questions = (questionStats as any[]).map((q, index) => ({
      id: q.id,
      index,
      text: q.text,
      type: q.type,
      correctAnswer: q.correct_answer,
      options: q.options,
      statistics: {
        correctCount: parseInt(q.correct_count) || 0,
        incorrectCount: parseInt(q.incorrect_count) || 0,
        skippedCount: parseInt(q.skipped_count) || 0,
        averageTime: parseFloat(q.average_time) || 0,
      },
    }));

    res.json({
      success: true,
      data: {
        id: session.id,
        sessionId: session.id,
        sessionCode: session.code,
        quizTitle: session.quiz_title,
        quizId: session.quiz_id,
        totalQuestions: session.total_questions,
        startedAt: session.started_at,
        completedAt: session.ended_at,
        participants: participantsWithResponses,
        questions,
        statistics,
      },
    });
  } catch (error) {
    console.error('Error fetching session results:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: 'Failed to fetch session results' });
    }
  }
};

export const exportSessionResultsPDF = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const userId = req.user?.id;

  try {
    // Get session and results data (reuse logic from getSessionResults)
    const [session]: any = await sequelize.query(
      `SELECT qs.*, q.title as quiz_title, q.total_questions
       FROM quiz_sessions qs
       JOIN quizzes q ON qs.quiz_id = q.id
       WHERE qs.id = $1`,
      {
        bind: [sessionId],
        type: QueryTypes.SELECT,
      }
    );

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    if (session.host_id !== userId && req.user?.role !== 'admin') {
      throw new AppError('Unauthorized', 403);
    }

    // Create PDF document
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="results-${session.code}.pdf"`);
    
    doc.pipe(res);
    
    // Add content to PDF
    doc.fontSize(20).text('AristoTest Session Results', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(`Quiz: ${session.quiz_title}`, { align: 'center' });
    doc.fontSize(12).text(`Session Code: ${session.code}`, { align: 'center' });
    doc.fontSize(10).text(`Date: ${new Date(session.ended_at).toLocaleString()}`, { align: 'center' });
    doc.moveDown();

    // Get participants
    const participants = await sequelize.query(
      `SELECT 
        sp.nickname as name,
        sp.score,
        ROUND((sp.score::numeric / q.total_questions) * 100, 1) as percentage
       FROM session_participants sp
       JOIN quiz_sessions qs ON sp.session_id = qs.id
       JOIN quizzes q ON qs.quiz_id = q.id
       WHERE sp.session_id = $1
       ORDER BY sp.score DESC`,
      {
        bind: [sessionId],
        type: QueryTypes.SELECT,
      }
    );

    // Add results table
    doc.fontSize(14).text('Results Summary', { underline: true });
    doc.moveDown();
    
    (participants as any[]).forEach((participant, index) => {
      doc.fontSize(10).text(
        `${index + 1}. ${participant.name}: ${participant.score}/${session.total_questions} (${participant.percentage}%)`,
        { indent: 20 }
      );
    });

    doc.end();
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ success: false, message: 'Failed to export PDF' });
  }
};

export const exportSessionResultsExcel = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const userId = req.user?.id;

  try {
    // Get session data
    const [session]: any = await sequelize.query(
      `SELECT qs.*, q.title as quiz_title, q.total_questions
       FROM quiz_sessions qs
       JOIN quizzes q ON qs.quiz_id = q.id
       WHERE qs.id = $1`,
      {
        bind: [sessionId],
        type: QueryTypes.SELECT,
      }
    );

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    if (session.host_id !== userId && req.user?.role !== 'admin') {
      throw new AppError('Unauthorized', 403);
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Results');

    // Add headers
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Score', key: 'score', width: 10 },
      { header: 'Percentage', key: 'percentage', width: 12 },
      { header: 'Time Spent', key: 'timeSpent', width: 12 },
    ];

    // Get participants
    const participants = await sequelize.query(
      `SELECT 
        sp.nickname as name,
        sp.email,
        sp.score,
        ROUND((sp.score::numeric / q.total_questions) * 100, 1) as percentage,
        EXTRACT(EPOCH FROM (sp.completed_at - sp.joined_at)) as time_spent
       FROM session_participants sp
       JOIN quiz_sessions qs ON sp.session_id = qs.id
       JOIN quizzes q ON qs.quiz_id = q.id
       WHERE sp.session_id = $1
       ORDER BY sp.score DESC`,
      {
        bind: [sessionId],
        type: QueryTypes.SELECT,
      }
    );

    // Add data
    (participants as any[]).forEach(participant => {
      worksheet.addRow({
        name: participant.name,
        email: participant.email || '-',
        score: `${participant.score}/${session.total_questions}`,
        percentage: `${participant.percentage}%`,
        timeSpent: `${Math.floor(participant.time_spent / 60)}:${Math.floor(participant.time_spent % 60).toString().padStart(2, '0')}`,
      });
    });

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="results-${session.code}.xlsx"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting Excel:', error);
    res.status(500).json({ success: false, message: 'Failed to export Excel' });
  }
};

export const emailSessionResults = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const userId = req.user?.id;

  try {
    // Get session data
    const [session]: any = await sequelize.query(
      `SELECT qs.*, q.title as quiz_title
       FROM quiz_sessions qs
       JOIN quizzes q ON qs.quiz_id = q.id
       WHERE qs.id = $1`,
      {
        bind: [sessionId],
        type: QueryTypes.SELECT,
      }
    );

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    if (session.host_id !== userId && req.user?.role !== 'admin') {
      throw new AppError('Unauthorized', 403);
    }

    // Get participants with email
    const participants = await sequelize.query(
      `SELECT 
        sp.nickname as name,
        sp.email,
        sp.score,
        ROUND((sp.score::numeric / q.total_questions) * 100, 1) as percentage
       FROM session_participants sp
       JOIN quiz_sessions qs ON sp.session_id = qs.id
       JOIN quizzes q ON qs.quiz_id = q.id
       WHERE sp.session_id = $1 AND sp.email IS NOT NULL`,
      {
        bind: [sessionId],
        type: QueryTypes.SELECT,
      }
    );

    // Create transporter (you'll need to configure this with your email service)
    const transporter = nodemailer.createTransport({
      host: env.EMAIL_HOST || 'smtp.gmail.com',
      port: env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS,
      },
    });

    // Send email to each participant
    const emailPromises = (participants as any[]).map(participant => {
      const mailOptions = {
        from: env.EMAIL_FROM || 'noreply@aristotest.com',
        to: participant.email,
        subject: `Your Results: ${session.quiz_title}`,
        html: `
          <h2>AristoTest Quiz Results</h2>
          <h3>${session.quiz_title}</h3>
          <p>Dear ${participant.name},</p>
          <p>Here are your results from the quiz session:</p>
          <ul>
            <li><strong>Score:</strong> ${participant.score}/${session.total_questions}</li>
            <li><strong>Percentage:</strong> ${participant.percentage}%</li>
          </ul>
          <p>Thank you for participating!</p>
          <hr>
          <p><small>This is an automated email from AristoTest.</small></p>
        `,
      };

      return transporter.sendMail(mailOptions);
    });

    await Promise.all(emailPromises);

    res.json({
      success: true,
      message: `Results sent to ${participants.length} participant(s)`,
    });
  } catch (error) {
    console.error('Error sending emails:', error);
    res.status(500).json({ success: false, message: 'Failed to send emails' });
  }
};