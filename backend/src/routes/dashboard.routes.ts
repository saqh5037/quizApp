import { Router } from 'express';
import { simpleAuth } from '../middleware/auth.simple.middleware';
import * as dashboardController from '../controllers/dashboard.controller';

const router = Router();

// Get dashboard statistics
router.get('/stats', simpleAuth, dashboardController.getDashboardStats);

// Get recent activities
router.get('/activities', simpleAuth, dashboardController.getDashboardActivities);

// Get upcoming sessions
router.get('/upcoming-sessions', simpleAuth, dashboardController.getUpcomingSessions);

// Get notifications
router.get('/notifications', simpleAuth, dashboardController.getDashboardNotifications);

// Get performance data for charts
router.get('/performance', simpleAuth, dashboardController.getDashboardPerformance);

export default router;