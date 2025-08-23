import { Router } from 'express';
import { simpleAuth } from '../middleware/auth.simple.middleware';
import * as userController from '../controllers/user.controller';

const router = Router();

// Get user profile
router.get('/profile', simpleAuth, userController.getUserProfile);

// Update user profile
router.put('/profile', simpleAuth, userController.updateUserProfile);

// Change password
router.post('/change-password', simpleAuth, userController.changePassword);

// Upload avatar
router.post('/avatar', simpleAuth, userController.uploadAvatar, userController.uploadUserAvatar);

// Get user statistics
router.get('/stats', simpleAuth, userController.getUserStats);

// Get user activity
router.get('/activity', simpleAuth, userController.getUserActivity);

// Update user preferences
router.put('/preferences', simpleAuth, userController.updateUserPreferences);

// Delete user account
router.delete('/account', simpleAuth, userController.deleteUserAccount);

export default router;