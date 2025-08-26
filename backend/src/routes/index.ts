import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Manual from '../models/Manual.model';
import authRoutes from './auth.routes';
import quizRoutes from './quiz.routes';
import sessionRoutes from './session.routes';
import userRoutes from './user.routes';
import dashboardRoutes from './dashboard.routes';
import gradingRoutes from './grading.routes';
import resultsRoutes from './results.routes';
import videoRoutes from './video.routes';
import tenantRoutes from './tenant.routes';
import classroomRoutes from './classroom.routes';
import trainingProgramRoutes from './training-program.routes';
import certificateRoutes from './certificate.routes';
// import aiRoutes from './ai.routes';
// import { authenticateToken } from '@middleware/auth.middleware';
// Manual routes disabled temporarily - direct implementation below

const router = Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'manuals');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'));
    }
  }
});

// Welcome route
router.get('/', (req, res) => {
  res.json({
    message: 'AristoTest API',
    version: '1.0.0',
    documentation: '/api/v1/docs',
    endpoints: {
      auth: '/api/v1/auth',
      quizzes: '/api/v1/quizzes',
      sessions: '/api/v1/sessions',
      videos: '/api/v1/videos',
    },
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/quizzes', quizRoutes);
router.use('/sessions', sessionRoutes);
router.use('/users', userRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/grading', gradingRoutes);
router.use('/results', resultsRoutes);
router.use('/videos', videoRoutes);

// Multi-tenant routes
router.use('/tenants', tenantRoutes);
router.use('/classrooms', classroomRoutes);
router.use('/programs', trainingProgramRoutes);
router.use('/certificates', certificateRoutes);

// AI routes
import aiRoutes from './ai.routes';
router.use('/ai', aiRoutes);

// Manual routes - direct implementation
router.get('/manuals/test', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Manual routes working' });
});

// Manual upload endpoint  
router.post('/manuals/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se proporcionó ningún archivo' });
    }

    const { title, description } = req.body;
    const userId = 1; // Default admin user for testing
    const tenantId = 1; // Default tenant for testing

    if (!title) {
      // Delete uploaded file if validation fails
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: 'El título es requerido' });
    }

    // Create manual record in database
    const manual = await Manual.create({
      title,
      description: description || null,
      file_path: req.file.path,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      user_id: userId,
      tenant_id: tenantId,
      status: 'ready',
      metadata: {
        originalName: req.file.originalname,
        filename: req.file.filename
      }
    });

    res.status(201).json({
      success: true,
      message: 'Manual subido exitosamente',
      data: {
        id: manual.id,
        title: manual.title,
        description: manual.description,
        filename: manual.metadata?.filename || req.file.filename,
        originalName: manual.metadata?.originalName || req.file.originalname,
        path: manual.file_path,
        size: manual.file_size,
        mimeType: manual.mime_type,
        userId: manual.user_id,
        tenantId: manual.tenant_id,
        status: manual.status,
        createdAt: manual.created_at
      }
    });

  } catch (error: any) {
    console.error('Error uploading manual:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Get manuals endpoint
router.get('/manuals', async (req: Request, res: Response) => {
  try {
    // Get all manuals from database
    const manuals = await Manual.findAll({
      order: [['created_at', 'DESC']],
      attributes: [
        'id', 'title', 'description', 'file_size', 'mime_type', 
        'status', 'user_id', 'tenant_id', 'metadata', 'created_at', 'file_path'
      ]
    });

    const formattedManuals = manuals.map(manual => ({
      id: manual.id,
      title: manual.title,
      description: manual.description,
      filename: manual.metadata?.filename || 'unknown',
      originalName: manual.metadata?.originalName || 'unknown',
      path: manual.file_path,
      size: manual.file_size,
      mimeType: manual.mime_type,
      userId: manual.user_id,
      tenantId: manual.tenant_id,
      status: manual.status,
      createdAt: manual.created_at
    }));

    res.json({
      success: true,
      data: formattedManuals,
      message: 'Lista de manuales'
    });
  } catch (error: any) {
    console.error('Error fetching manuals:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Get single manual
router.get('/manuals/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const manual = await Manual.findByPk(id);

    if (!manual) {
      return res.status(404).json({
        success: false,
        error: 'Manual no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        id: manual.id,
        title: manual.title,
        description: manual.description,
        filename: manual.metadata?.filename || 'unknown',
        originalName: manual.metadata?.originalName || 'unknown',
        path: manual.file_path,
        size: manual.file_size,
        mimeType: manual.mime_type,
        userId: manual.user_id,
        tenantId: manual.tenant_id,
        status: manual.status,
        createdAt: manual.created_at
      }
    });
  } catch (error: any) {
    console.error('Error fetching manual:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Update manual
router.put('/manuals/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    
    const manual = await Manual.findByPk(id);
    if (!manual) {
      return res.status(404).json({
        success: false,
        error: 'Manual no encontrado'
      });
    }

    await manual.update({
      title: title || manual.title,
      description: description !== undefined ? description : manual.description
    });

    res.json({
      success: true,
      data: {
        id: manual.id,
        title: manual.title,
        description: manual.description,
        filename: manual.metadata?.filename || 'unknown',
        originalName: manual.metadata?.originalName || 'unknown',
        path: manual.file_path,
        size: manual.file_size,
        mimeType: manual.mime_type,
        userId: manual.user_id,
        tenantId: manual.tenant_id,
        status: manual.status,
        createdAt: manual.created_at
      },
      message: 'Manual actualizado exitosamente'
    });
  } catch (error: any) {
    console.error('Error updating manual:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el manual'
    });
  }
});

// Delete manual
router.delete('/manuals/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const manual = await Manual.findByPk(id);
    if (!manual) {
      return res.status(404).json({
        success: false,
        error: 'Manual no encontrado'
      });
    }

    // Delete file from filesystem
    if (manual.file_path && fs.existsSync(manual.file_path)) {
      fs.unlinkSync(manual.file_path);
    }

    await manual.destroy();

    res.json({
      success: true,
      message: 'Manual eliminado exitosamente'
    });
  } catch (error: any) {
    console.error('Error deleting manual:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el manual'
    });
  }
});

export default router;