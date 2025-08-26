import { Router } from 'express';
import CertificateController from '@controllers/certificate.controller';
import { authenticate } from '@middleware/auth.middleware';
import { tenantMiddleware } from '@middleware/tenant.middleware';

const router = Router();

// Public verification route (no auth required)
router.get('/verify/:code', CertificateController.verifyCertificate);

// All other routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

// Get certificates for current user
router.get('/', CertificateController.getUserCertificates);
router.get('/stats', CertificateController.getCertificateStats);

// Issue certificates
router.post('/quiz', CertificateController.issueQuizCertificate);
router.post('/program', CertificateController.issueProgramCertificate);
router.post('/classroom', CertificateController.issueClassroomCertificate);

// Generate PDF
router.get('/:id/pdf', CertificateController.generateCertificatePDF);

export default router;