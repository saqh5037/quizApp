import { Router } from 'express';
import { body, query, param } from 'express-validator';
import multer from 'multer';
import videoController from '../controllers/video.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();

// Configure multer for chunk uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max chunk size
  }
});

// Public routes
router.get('/categories', videoController.getCategories.bind(videoController));

router.get('/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().isString(),
    query('search').optional().isString(),
    query('status').optional().isIn(['draft', 'uploading', 'processing', 'ready', 'error']),
    query('sort').optional().isIn(['createdAt', 'title', 'viewCount', 'duration']),
    query('order').optional().isIn(['ASC', 'DESC'])
  ],
  validateRequest,
  videoController.getVideos.bind(videoController)
);

router.get('/:id', videoController.getVideo.bind(videoController));

// Public video routes (no authentication required)
router.get('/:id/public', videoController.getPublicVideo.bind(videoController));
router.get('/:id/public-interactive', videoController.getPublicInteractiveVideo.bind(videoController));
router.post('/:id/track-completion', videoController.trackPublicCompletion.bind(videoController));
router.post('/:id/interactive-results', videoController.saveInteractiveResults.bind(videoController));

// Protected routes - require authentication
router.use(authenticate);

// Upload routes
router.post('/upload/init',
  [
    body('filename').notEmpty().withMessage('Filename is required'),
    body('fileSize').isInt({ min: 1 }).withMessage('Valid file size is required'),
    body('mimeType').notEmpty().withMessage('MIME type is required'),
    body('metadata.title').notEmpty().withMessage('Video title is required'),
    body('metadata.category').optional().isString(),
    body('metadata.description').optional().isString(),
    body('metadata.tags').optional().isArray(),
    body('metadata.isPublic').optional().isBoolean(),
    body('metadata.allowDownload').optional().isBoolean()
  ],
  validateRequest,
  videoController.initializeUpload.bind(videoController)
);

router.post('/upload/chunk',
  upload.single('chunk'),
  [
    body('uploadId').notEmpty().withMessage('Upload ID is required'),
    body('chunkIndex').isInt({ min: 0 }).withMessage('Valid chunk index is required')
  ],
  validateRequest,
  videoController.uploadChunk.bind(videoController)
);

router.post('/upload/complete',
  [
    body('uploadId').notEmpty().withMessage('Upload ID is required')
  ],
  validateRequest,
  videoController.completeUpload.bind(videoController)
);

router.get('/upload/:uploadId/progress',
  videoController.getUploadProgress.bind(videoController)
);

router.get('/upload/:uploadId/resume',
  videoController.resumeUpload.bind(videoController)
);

router.delete('/upload/:uploadId',
  videoController.cancelUpload.bind(videoController)
);

// Video management routes
router.put('/:id',
  [
    param('id').isInt().withMessage('Valid video ID is required'),
    body('title').optional().notEmpty(),
    body('description').optional().isString(),
    body('category').optional().isString(),
    body('tags').optional().isArray(),
    body('isPublic').optional().isBoolean(),
    body('allowDownload').optional().isBoolean()
  ],
  validateRequest,
  videoController.updateVideo.bind(videoController)
);

router.delete('/:id',
  [
    param('id').isInt().withMessage('Valid video ID is required')
  ],
  validateRequest,
  videoController.deleteVideo.bind(videoController)
);

// Progress tracking
router.post('/:videoId/progress',
  [
    param('videoId').isInt().withMessage('Valid video ID is required'),
    body('currentTime').isFloat({ min: 0 }).withMessage('Valid current time is required'),
    body('duration').isFloat({ min: 0 }).withMessage('Valid duration is required')
  ],
  validateRequest,
  videoController.updateProgress.bind(videoController)
);

export default router;