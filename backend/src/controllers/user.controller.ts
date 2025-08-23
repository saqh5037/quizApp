import { Request, Response } from 'express';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';
import bcrypt from 'bcrypt';
import { AppError } from '../utils/errorHandler';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/avatars');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `avatar-${req.user?.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
}).single('avatar');

export const getUserProfile = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  try {
    const [user]: any = await sequelize.query(
      `SELECT id, email, first_name, last_name, role, avatar, phone, bio, created_at, updated_at
       FROM users WHERE id = $1`,
      {
        bind: [userId],
        type: QueryTypes.SELECT,
      }
    );

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        bio: user.bio,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { firstName, lastName, email, phone, bio } = req.body;

  try {
    // Check if email is already taken by another user
    if (email) {
      const [existingUser]: any = await sequelize.query(
        `SELECT id FROM users WHERE email = $1 AND id != $2`,
        {
          bind: [email, userId],
          type: QueryTypes.SELECT,
        }
      );

      if (existingUser) {
        throw new AppError('Email already in use', 400);
      }
    }

    // Update user profile
    await sequelize.query(
      `UPDATE users 
       SET first_name = $1, last_name = $2, email = $3, phone = $4, bio = $5, updated_at = NOW()
       WHERE id = $6`,
      {
        bind: [firstName, lastName, email, phone, bio, userId],
        type: QueryTypes.UPDATE,
      }
    );

    // Fetch updated user
    const [updatedUser]: any = await sequelize.query(
      `SELECT id, email, first_name, last_name, role, avatar, phone, bio, created_at, updated_at
       FROM users WHERE id = $1`,
      {
        bind: [userId],
        type: QueryTypes.SELECT,
      }
    );

    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        phone: updatedUser.phone,
        bio: updatedUser.bio,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at,
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
  }
};

export const changePassword = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { currentPassword, newPassword } = req.body;

  try {
    // Get current password hash
    const [user]: any = await sequelize.query(
      `SELECT password_hash FROM users WHERE id = $1`,
      {
        bind: [userId],
        type: QueryTypes.SELECT,
      }
    );

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      throw new AppError('Current password is incorrect', 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await sequelize.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      {
        bind: [hashedPassword, userId],
        type: QueryTypes.UPDATE,
      }
    );

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: 'Failed to change password' });
    }
  }
};

export const uploadUserAvatar = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    // Generate avatar URL (you might want to use a CDN or cloud storage in production)
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Update user avatar
    await sequelize.query(
      `UPDATE users SET avatar = $1, updated_at = NOW() WHERE id = $2`,
      {
        bind: [avatarUrl, userId],
        type: QueryTypes.UPDATE,
      }
    );

    res.json({
      success: true,
      data: {
        avatarUrl,
      },
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: 'Failed to upload avatar' });
    }
  }
};

export const getUserStats = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;

  try {
    let stats: any = {};

    if (userRole === 'teacher' || userRole === 'admin') {
      // Teacher statistics
      const [quizStats]: any = await sequelize.query(
        `SELECT 
          COUNT(DISTINCT q.id) as quizzes_created,
          COUNT(DISTINCT qs.id) as sessions_hosted,
          COUNT(DISTINCT sp.id) as students_reached,
          AVG(sp.score) as average_score
         FROM users u
         LEFT JOIN quizzes q ON q.creator_id = u.id
         LEFT JOIN quiz_sessions qs ON qs.host_id = u.id
         LEFT JOIN session_participants sp ON sp.session_id = qs.id
         WHERE u.id = $1
         GROUP BY u.id`,
        {
          bind: [userId],
          type: QueryTypes.SELECT,
        }
      );

      stats = {
        quizzesCreated: parseInt(quizStats?.quizzes_created || 0),
        sessionsHosted: parseInt(quizStats?.sessions_hosted || 0),
        studentsReached: parseInt(quizStats?.students_reached || 0),
        averageScore: parseFloat(quizStats?.average_score || 0).toFixed(1),
      };
    } else {
      // Student statistics
      const [studentStats]: any = await sequelize.query(
        `SELECT 
          COUNT(DISTINCT sp.session_id) as total_participations,
          AVG(sp.score) as average_score,
          COUNT(DISTINCT qs.quiz_id) as total_quizzes
         FROM session_participants sp
         LEFT JOIN quiz_sessions qs ON sp.session_id = qs.id
         WHERE sp.user_id = $1`,
        {
          bind: [userId],
          type: QueryTypes.SELECT,
        }
      );

      stats = {
        totalQuizzes: parseInt(studentStats?.total_quizzes || 0),
        totalParticipations: parseInt(studentStats?.total_participations || 0),
        averageScore: parseFloat(studentStats?.average_score || 0).toFixed(1),
      };
    }

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};

export const getUserActivity = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  try {
    // Get recent activities (you can customize this based on your activity tracking)
    const activities = await sequelize.query(
      `(SELECT 
          'quiz_created' as type,
          q.title as title,
          'Created a new quiz' as description,
          q.created_at as timestamp
        FROM quizzes q
        WHERE q.creator_id = $1
        ORDER BY q.created_at DESC
        LIMIT 3)
       UNION ALL
       (SELECT 
          'session_hosted' as type,
          qs.name as title,
          'Hosted a quiz session' as description,
          qs.created_at as timestamp
        FROM quiz_sessions qs
        WHERE qs.host_id = $1
        ORDER BY qs.created_at DESC
        LIMIT 3)
       UNION ALL
       (SELECT 
          'session_joined' as type,
          qs.name as title,
          'Joined a quiz session' as description,
          sp.joined_at as timestamp
        FROM session_participants sp
        JOIN quiz_sessions qs ON sp.session_id = qs.id
        WHERE sp.user_id = $1
        ORDER BY sp.joined_at DESC
        LIMIT 3)
       ORDER BY timestamp DESC
       LIMIT 10`,
      {
        bind: [userId],
        type: QueryTypes.SELECT,
      }
    );

    // Add unique IDs to activities
    const formattedActivities = activities.map((activity: any, index) => ({
      id: index + 1,
      ...activity,
    }));

    res.json({
      success: true,
      data: formattedActivities,
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch activity' });
  }
};

export const updateUserPreferences = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const preferences = req.body;

  try {
    // Store preferences (you might want to create a separate preferences table)
    // For now, we'll store it as JSON in a metadata column
    await sequelize.query(
      `UPDATE users 
       SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{preferences}', $1::jsonb), 
           updated_at = NOW()
       WHERE id = $2`,
      {
        bind: [JSON.stringify(preferences), userId],
        type: QueryTypes.UPDATE,
      }
    );

    res.json({
      success: true,
      message: 'Preferences updated successfully',
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ success: false, message: 'Failed to update preferences' });
  }
};

export const deleteUserAccount = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  try {
    // Start transaction
    await sequelize.transaction(async (t) => {
      // Delete user's quiz sessions
      await sequelize.query(
        `DELETE FROM quiz_sessions WHERE host_id = $1`,
        {
          bind: [userId],
          type: QueryTypes.DELETE,
          transaction: t,
        }
      );

      // Delete user's quizzes
      await sequelize.query(
        `DELETE FROM quizzes WHERE creator_id = $1`,
        {
          bind: [userId],
          type: QueryTypes.DELETE,
          transaction: t,
        }
      );

      // Delete user's participations
      await sequelize.query(
        `DELETE FROM session_participants WHERE user_id = $1`,
        {
          bind: [userId],
          type: QueryTypes.DELETE,
          transaction: t,
        }
      );

      // Finally, delete the user
      await sequelize.query(
        `DELETE FROM users WHERE id = $1`,
        {
          bind: [userId],
          type: QueryTypes.DELETE,
          transaction: t,
        }
      );
    });

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ success: false, message: 'Failed to delete account' });
  }
};