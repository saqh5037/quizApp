import { Request, Response } from 'express';
import { Manual, ManualChat, AIGeneratedQuiz, ManualSummary, User } from '../models/index';
import { Op } from 'sequelize';
import { getTenantContext } from '../middleware/tenant.middleware';
import geminiService from '../services/gemini.service';
import { v4 as uuidv4 } from 'uuid';

export const startChatSession = async (req: Request, res: Response) => {
  try {
    const { manualId } = req.params;
    const userId = (req as any).user?.id;
    const { tenantId } = getTenantContext(req);

    // Verify manual exists and user has access
    const manual = await Manual.findOne({
      where: {
        id: manualId,
        ...(tenantId && { tenant_id: tenantId }),
        [Op.or]: [
          { user_id: userId },
          { is_public: true }
        ]
      }
    });

    if (!manual) {
      return res.status(404).json({
        success: false,
        error: 'Manual not found or access denied'
      });
    }

    if (!manual.extracted_text) {
      return res.status(400).json({
        success: false,
        error: 'Manual content is not yet processed for chat'
      });
    }

    // Generate new session ID
    const sessionId = uuidv4();

    res.json({
      success: true,
      data: {
        sessionId,
        manualId: manual.id,
        manualTitle: manual.title
      }
    });
  } catch (error) {
    console.error('Error starting chat session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start chat session'
    });
  }
};

export const sendChatMessage = async (req: Request, res: Response) => {
  try {
    const { manualId, sessionId } = req.params;
    const { message } = req.body;
    const userId = (req as any).user?.id;
    const { tenantId } = getTenantContext(req);

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Verify manual exists and user has access
    const manual = await Manual.findOne({
      where: {
        id: manualId,
        ...(tenantId && { tenant_id: tenantId }),
        [Op.or]: [
          { user_id: userId },
          { is_public: true }
        ]
      }
    });

    if (!manual) {
      return res.status(404).json({
        success: false,
        error: 'Manual not found or access denied'
      });
    }

    if (!manual.extracted_text) {
      return res.status(400).json({
        success: false,
        error: 'Manual content is not yet processed for chat'
      });
    }

    // Get recent chat history for context
    const chatHistory = await ManualChat.findAll({
      where: {
        manual_id: manualId,
        user_id: userId,
        session_id: sessionId,
        tenant_id: tenantId
      },
      order: [['created_at', 'ASC']],
      limit: 10
    });

    // Generate AI response
    const response = await geminiService.chatWithManual(
      message.trim(),
      manual.extracted_text,
      chatHistory.map(chat => ({
        role: chat.role,
        message: chat.message,
        response: chat.response
      }))
    );

    // Save user message
    const userChat = await ManualChat.create({
      manual_id: manualId,
      user_id: userId,
      tenant_id: tenantId,
      session_id: sessionId,
      message: message.trim(),
      response: '', // User messages don't have responses
      role: 'user'
    });

    // Save AI response
    const aiChat = await ManualChat.create({
      manual_id: manualId,
      user_id: userId,
      tenant_id: tenantId,
      session_id: sessionId,
      message: '', // AI responses don't have messages
      response: response,
      role: 'assistant'
    });

    res.json({
      success: true,
      data: {
        message: message.trim(),
        response: response,
        timestamp: aiChat.created_at
      }
    });
  } catch (error) {
    console.error('Error sending chat message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message'
    });
  }
};

export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const { manualId, sessionId } = req.params;
    const userId = (req as any).user?.id;
    const { tenantId } = getTenantContext(req);

    // Verify manual exists and user has access
    const manual = await Manual.findOne({
      where: {
        id: manualId,
        ...(tenantId && { tenant_id: tenantId }),
        [Op.or]: [
          { user_id: userId },
          { is_public: true }
        ]
      }
    });

    if (!manual) {
      return res.status(404).json({
        success: false,
        error: 'Manual not found or access denied'
      });
    }

    const chatHistory = await ManualChat.findAll({
      where: {
        manual_id: manualId,
        user_id: userId,
        session_id: sessionId,
        tenant_id: tenantId
      },
      order: [['created_at', 'ASC']],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName']
      }]
    });

    // Group messages by conversation pairs
    const conversation = [];
    for (let i = 0; i < chatHistory.length; i += 2) {
      const userMessage = chatHistory[i];
      const aiResponse = chatHistory[i + 1];
      
      if (userMessage && aiResponse) {
        conversation.push({
          id: userMessage.id,
          message: userMessage.message,
          response: aiResponse.response,
          timestamp: aiResponse.created_at,
          user: userMessage.user
        });
      }
    }

    res.json({
      success: true,
      data: {
        sessionId,
        manualId: manual.id,
        manualTitle: manual.title,
        conversation
      }
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat history'
    });
  }
};

export const generateQuiz = async (req: Request, res: Response) => {
  try {
    const { manualId } = req.params;
    const { 
      difficulty = 'medium', 
      questionCount = 5,
      title,
      description,
      customPrompt
    } = req.body;
    const userId = (req as any).user?.id;
    const { tenantId } = getTenantContext(req);

    // Validate input
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Quiz title is required'
      });
    }

    if (questionCount < 1 || questionCount > 20) {
      return res.status(400).json({
        success: false,
        error: 'Question count must be between 1 and 20'
      });
    }

    // Verify manual exists and user has access
    const manual = await Manual.findOne({
      where: {
        id: manualId,
        ...(tenantId && { tenant_id: tenantId }),
        [Op.or]: [
          { user_id: userId },
          { is_public: true }
        ]
      }
    });

    if (!manual) {
      return res.status(404).json({
        success: false,
        error: 'Manual not found or access denied'
      });
    }

    if (!manual.extracted_text) {
      return res.status(400).json({
        success: false,
        error: 'Manual content is not yet processed for quiz generation'
      });
    }

    // Create quiz record
    const quiz = await AIGeneratedQuiz.create({
      manual_id: manualId,
      user_id: userId,
      tenant_id: tenantId,
      title: title.trim(),
      description: description?.trim() || null,
      questions: [], // Will be updated after generation
      difficulty,
      question_count: questionCount,
      status: 'generating',
      generation_prompt: customPrompt || null
    });

    // Generate quiz asynchronously
    const generateQuizAsync = async () => {
      try {
        const questions = await geminiService.generateQuiz(
          manual.extracted_text,
          difficulty,
          questionCount,
          customPrompt
        );

        quiz.questions = questions;
        quiz.status = 'ready';
        await quiz.save();
      } catch (error) {
        console.error('Error generating quiz questions:', error);
        quiz.status = 'failed';
        quiz.metadata = { error: error.message };
        await quiz.save();
      }
    };

    // Start generation in background
    generateQuizAsync();

    res.status(201).json({
      success: true,
      data: {
        id: quiz.id,
        title: quiz.title,
        status: quiz.status,
        manualId: manual.id,
        manualTitle: manual.title
      },
      message: 'Quiz generation started. Check status for completion.'
    });
  } catch (error) {
    console.error('Error generating quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate quiz'
    });
  }
};

export const getGeneratedQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const { tenantId } = getTenantContext(req);

    const whereClause: any = { 
      id: quizId,
      tenant_id: tenantId 
    };
    
    // Access control
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      whereClause.user_id = userId;
    }

    const quiz = await AIGeneratedQuiz.findOne({
      where: whereClause,
      include: [
        {
          model: Manual,
          as: 'manual',
          attributes: ['id', 'title', 'description']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found or access denied'
      });
    }

    res.json({
      success: true,
      data: quiz
    });
  } catch (error) {
    console.error('Error fetching generated quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz'
    });
  }
};

export const generateSummary = async (req: Request, res: Response) => {
  try {
    const { manualId } = req.params;
    const { 
      summaryType = 'brief',
      title,
      customPrompt
    } = req.body;
    const userId = (req as any).user?.id;
    const { tenantId } = getTenantContext(req);

    // Validate input
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Summary title is required'
      });
    }

    if (!['brief', 'detailed', 'key_points'].includes(summaryType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid summary type. Must be: brief, detailed, or key_points'
      });
    }

    // Verify manual exists and user has access
    const manual = await Manual.findOne({
      where: {
        id: manualId,
        ...(tenantId && { tenant_id: tenantId }),
        [Op.or]: [
          { user_id: userId },
          { is_public: true }
        ]
      }
    });

    if (!manual) {
      return res.status(404).json({
        success: false,
        error: 'Manual not found or access denied'
      });
    }

    if (!manual.extracted_text) {
      return res.status(400).json({
        success: false,
        error: 'Manual content is not yet processed for summary generation'
      });
    }

    // Create summary record
    const summary = await ManualSummary.create({
      manual_id: manualId,
      user_id: userId,
      tenant_id: tenantId,
      title: title.trim(),
      summary_type: summaryType,
      content: '', // Will be updated after generation
      word_count: 0,
      status: 'generating',
      generation_prompt: customPrompt || null
    });

    // Generate summary asynchronously
    const generateSummaryAsync = async () => {
      try {
        const content = await geminiService.generateSummary(
          manual.extracted_text,
          summaryType,
          customPrompt
        );

        const wordCount = content.trim().split(/\s+/).length;

        summary.content = content;
        summary.word_count = wordCount;
        summary.status = 'ready';
        await summary.save();
      } catch (error) {
        console.error('Error generating summary:', error);
        summary.status = 'failed';
        summary.metadata = { error: error.message };
        await summary.save();
      }
    };

    // Start generation in background
    generateSummaryAsync();

    res.status(201).json({
      success: true,
      data: {
        id: summary.id,
        title: summary.title,
        summaryType: summary.summary_type,
        status: summary.status,
        manualId: manual.id,
        manualTitle: manual.title
      },
      message: 'Summary generation started. Check status for completion.'
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate summary'
    });
  }
};

export const getGeneratedSummary = async (req: Request, res: Response) => {
  try {
    const { summaryId } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    const { tenantId } = getTenantContext(req);
    
    const whereClause: any = { 
      id: summaryId,
      tenant_id: tenantId 
    };
    
    // Access control
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      whereClause.user_id = userId;
    }

    const summary = await ManualSummary.findOne({
      where: whereClause,
      include: [
        {
          model: Manual,
          as: 'manual',
          attributes: ['id', 'title', 'description']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'Summary not found or access denied'
      });
    }

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching generated summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch summary'
    });
  }
};