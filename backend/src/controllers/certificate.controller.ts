import { Request, Response } from 'express';
import { 
  Certificate, 
  User, 
  Quiz,
  TrainingProgram,
  Classroom,
  ClassroomEnrollment,
  Tenant,
  QuizSession,
  Participant
} from '../models/index';
import { getTenantContext } from '../middleware/tenant.middleware';
import { sequelize } from '../config/database';
import { Op } from 'sequelize';
// import PDFDocument from 'pdfkit';  // Commented out for now, will implement later
import fs from 'fs';
import path from 'path';

export class CertificateController {
  /**
   * Get all certificates for current user or specific user
   */
  async getUserCertificates(req: Request, res: Response) {
    try {
      const { tenantId, userId, userRole } = getTenantContext(req);
      const { user_id = userId } = req.query;
      const { page = 1, limit = 10, type } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      // Users can only see their own certificates unless they're admin
      const targetUserId = userRole === 'admin' || userRole === 'super_admin' 
        ? user_id 
        : userId;

      const whereClause: any = { 
        tenant_id: tenantId,
        user_id: targetUserId
      };

      if (type) {
        whereClause.certificate_type = type;
      }

      const { count, rows: certificates } = await Certificate.findAndCountAll({
        where: whereClause,
        limit: Number(limit),
        offset,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ],
        order: [['issued_date', 'DESC']]
      });

      // Add validity status
      const certificatesWithStatus = certificates.map(cert => ({
        ...cert.toJSON(),
        isValid: cert.isValid(),
        daysUntilExpiry: cert.getDaysUntilExpiry()
      }));

      res.json({
        success: true,
        data: certificatesWithStatus,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(count / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching certificates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch certificates'
      });
    }
  }

  /**
   * Issue certificate for quiz completion
   */
  async issueQuizCertificate(req: Request, res: Response) {
    const t = await sequelize.transaction();
    
    try {
      const { tenantId, userId } = getTenantContext(req);
      const { quiz_id, session_id } = req.body;

      // Verify quiz session and score
      const session = await QuizSession.findOne({
        where: { 
          id: session_id,
          quiz_id,
          status: 'ended'
        },
        include: [
          {
            model: Participant,
            as: 'participants',
            where: { user_id: userId },
            required: true
          },
          {
            model: Quiz,
            as: 'quiz',
            attributes: ['id', 'title', 'passingScore']
          }
        ]
      });

      if (!session) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Quiz session not found or not completed'
        });
      }

      const participant = session.participants[0];
      const score = participant.score || 0;
      const passingScore = session.quiz.passingScore || 70;

      if (score < passingScore) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: `Score ${score}% is below passing score of ${passingScore}%`
        });
      }

      // Issue certificate
      const certificate = await Certificate.issueCertificate({
        tenant_id: tenantId,
        user_id: userId,
        type: 'quiz',
        related_id: quiz_id,
        name: `Certificate of Completion - ${session.quiz.title}`,
        metadata: {
          score,
          passingScore,
          sessionId: session_id,
          completedAt: session.endedAt
        }
      });

      await t.commit();

      res.status(201).json({
        success: true,
        data: certificate,
        message: 'Quiz certificate issued successfully'
      });
    } catch (error) {
      await t.rollback();
      console.error('Error issuing quiz certificate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to issue quiz certificate'
      });
    }
  }

  /**
   * Issue certificate for program completion
   */
  async issueProgramCertificate(req: Request, res: Response) {
    const t = await sequelize.transaction();
    
    try {
      const { tenantId, userId } = getTenantContext(req);
      const { program_id } = req.body;

      // Get program and check progress
      const program = await TrainingProgram.findOne({
        where: { 
          id: program_id,
          tenant_id: tenantId
        }
      });

      if (!program) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Training program not found'
        });
      }

      const progress = await program.getProgress(userId);

      if (progress.progressPercentage < 100) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: `Program is only ${progress.progressPercentage}% complete`
        });
      }

      // Issue certificate
      const certificate = await Certificate.issueCertificate({
        tenant_id: tenantId,
        user_id: userId,
        type: 'program',
        related_id: program_id,
        name: `Certificate of Completion - ${program.name}`,
        metadata: {
          ...progress,
          programName: program.name,
          completedAt: new Date()
        }
      });

      await t.commit();

      res.status(201).json({
        success: true,
        data: certificate,
        message: 'Program certificate issued successfully'
      });
    } catch (error) {
      await t.rollback();
      console.error('Error issuing program certificate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to issue program certificate'
      });
    }
  }

  /**
   * Issue certificate for classroom completion
   */
  async issueClassroomCertificate(req: Request, res: Response) {
    const t = await sequelize.transaction();
    
    try {
      const { tenantId, userId } = getTenantContext(req);
      const { classroom_id, reason = 'completion' } = req.body;

      // Verify classroom enrollment
      const enrollment = await ClassroomEnrollment.findOne({
        where: {
          classroom_id,
          user_id: userId,
          tenant_id: tenantId,
          status: 'completed'
        },
        include: [{
          model: Classroom,
          as: 'classroom',
          attributes: ['id', 'name']
        }]
      });

      if (!enrollment) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Classroom enrollment not found or not completed'
        });
      }

      // Issue certificate
      const certificate = await Certificate.issueCertificate({
        tenant_id: tenantId,
        user_id: userId,
        type: 'classroom',
        related_id: classroom_id,
        name: `Certificate of ${reason === 'participation' ? 'Participation' : 'Completion'} - ${enrollment.classroom.name}`,
        metadata: {
          classroomName: enrollment.classroom.name,
          enrollmentRole: enrollment.role,
          enrolledAt: enrollment.enrolled_at,
          completedAt: enrollment.completed_at,
          reason
        }
      });

      await t.commit();

      res.status(201).json({
        success: true,
        data: certificate,
        message: 'Classroom certificate issued successfully'
      });
    } catch (error) {
      await t.rollback();
      console.error('Error issuing classroom certificate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to issue classroom certificate'
      });
    }
  }

  /**
   * Verify certificate by code
   */
  async verifyCertificate(req: Request, res: Response) {
    try {
      const { code } = req.params;

      const result = await Certificate.verifyCertificate(code);

      if (!result.valid && !result.certificate) {
        return res.status(404).json({
          success: false,
          error: result.message
        });
      }

      // Get related entity details
      let relatedEntity = null;
      if (result.certificate) {
        relatedEntity = await result.certificate.getRelatedEntity();
      }

      res.json({
        success: true,
        data: {
          valid: result.valid,
          message: result.message,
          certificate: result.certificate ? {
            ...result.certificate.toJSON(),
            relatedEntity
          } : null
        }
      });
    } catch (error) {
      console.error('Error verifying certificate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify certificate'
      });
    }
  }

  /**
   * Generate certificate PDF
   */
  async generateCertificatePDF(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tenantId, userId, userRole } = getTenantContext(req);

      const certificate = await Certificate.findOne({
        where: { 
          id,
          tenant_id: tenantId
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: Tenant,
            as: 'tenant',
            attributes: ['id', 'name', 'branding']
          }
        ]
      });

      if (!certificate) {
        return res.status(404).json({
          success: false,
          error: 'Certificate not found'
        });
      }

      // Check permission
      if (certificate.user_id !== userId && !['admin', 'super_admin'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: 'You can only download your own certificates'
        });
      }

      // Create PDF - Temporarily return JSON until pdfkit is properly configured
      return res.json({
        success: true,
        data: {
          certificate,
          message: 'PDF generation will be implemented soon'
        }
      });
      
      /* const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 50
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=certificate-${certificate.verification_code}.pdf`);

      // Pipe to response
      doc.pipe(res);

      // Get branding
      const branding = certificate.tenant.branding as any;
      const primaryColor = branding.primaryColor || '#0066CC';

      // Add border
      doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
         .lineWidth(2)
         .stroke(primaryColor);

      // Add inner border
      doc.rect(40, 40, doc.page.width - 80, doc.page.height - 80)
         .lineWidth(1)
         .stroke(primaryColor);

      // Title
      doc.fontSize(36)
         .fillColor(primaryColor)
         .text('CERTIFICATE', 0, 100, { align: 'center' });

      doc.fontSize(24)
         .fillColor('#333333')
         .text('OF ' + certificate.certificate_type.toUpperCase(), 0, 150, { align: 'center' });

      // Recipient name
      doc.fontSize(16)
         .fillColor('#666666')
         .text('This is to certify that', 0, 220, { align: 'center' });

      doc.fontSize(28)
         .fillColor('#000000')
         .text(certificate.user.fullName || `${certificate.user.firstName} ${certificate.user.lastName}`, 0, 250, { align: 'center' });

      // Certificate name
      doc.fontSize(16)
         .fillColor('#666666')
         .text('has successfully completed', 0, 300, { align: 'center' });

      doc.fontSize(20)
         .fillColor(primaryColor)
         .text(certificate.name, 0, 330, { align: 'center' });

      // Date
      doc.fontSize(14)
         .fillColor('#666666')
         .text(`Issued on ${new Date(certificate.issued_date).toLocaleDateString('en-US', {
           year: 'numeric',
           month: 'long',
           day: 'numeric'
         })}`, 0, 380, { align: 'center' });

      // Organization
      doc.fontSize(18)
         .fillColor('#000000')
         .text(certificate.tenant.name, 0, 420, { align: 'center' });

      // Verification code
      doc.fontSize(10)
         .fillColor('#999999')
         .text(`Verification Code: ${certificate.verification_code}`, 0, 480, { align: 'center' });

      doc.fontSize(10)
         .text(`Verify at: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/certificates/verify`, 0, 495, { align: 'center' });

      // Metadata (if quiz certificate with score)
      const metadata = certificate.metadata as any;
      if (certificate.certificate_type === 'quiz' && metadata.score) {
        doc.fontSize(12)
           .fillColor('#666666')
           .text(`Score: ${metadata.score}%`, 0, 520, { align: 'center' });
      }

      // Finalize PDF
      doc.end(); */

    } catch (error) {
      console.error('Error generating certificate PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate certificate PDF'
      });
    }
  }

  /**
   * Get certificate statistics
   */
  async getCertificateStats(req: Request, res: Response) {
    try {
      const { tenantId } = getTenantContext(req);

      const [
        totalCertificates,
        quizCertificates,
        programCertificates,
        classroomCertificates,
        tenantCertificates,
        validCertificates,
        expiredCertificates
      ] = await Promise.all([
        Certificate.count({ where: { tenant_id: tenantId } }),
        Certificate.count({ where: { tenant_id: tenantId, certificate_type: 'quiz' } }),
        Certificate.count({ where: { tenant_id: tenantId, certificate_type: 'program' } }),
        Certificate.count({ where: { tenant_id: tenantId, certificate_type: 'classroom' } }),
        Certificate.count({ where: { tenant_id: tenantId, certificate_type: 'tenant' } }),
        Certificate.count({ 
          where: { 
            tenant_id: tenantId,
            [Op.or]: [
              { expiry_date: null },
              { expiry_date: { [Op.gt]: new Date() } }
            ]
          } 
        }),
        Certificate.count({ 
          where: { 
            tenant_id: tenantId,
            expiry_date: { [Op.lt]: new Date() }
          } 
        })
      ]);

      res.json({
        success: true,
        data: {
          total: totalCertificates,
          byType: {
            quiz: quizCertificates,
            program: programCertificates,
            classroom: classroomCertificates,
            tenant: tenantCertificates
          },
          byStatus: {
            valid: validCertificates,
            expired: expiredCertificates
          }
        }
      });
    } catch (error) {
      console.error('Error fetching certificate stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch certificate statistics'
      });
    }
  }
}

export default new CertificateController();