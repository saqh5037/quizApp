import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  generateEducationalResource,
  getEducationalResource,
  listEducationalResources,
  updateFlashCardStats
} from '../controllers/educational-resources.controller';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);

// Generate educational resource (summary, study guide, or flash cards)
router.post('/manuals/:manualId/resources', generateEducationalResource);

// List all educational resources for a manual
router.get('/manuals/:manualId/resources', listEducationalResources);

// Get specific educational resource
router.get('/resources/:resourceType/:resourceId', getEducationalResource);

// Update flash card study statistics
router.patch('/flash-cards/:flashCardId/stats', updateFlashCardStats);

export default router;