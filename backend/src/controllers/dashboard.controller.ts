import { Request, Response } from 'express';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

export const getDashboardStats = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;

  try {
    let stats: any = {};

    if (userRole === 'teacher' || userRole === 'admin') {
      // Teacher/Admin statistics
      const [basicStats]: any = await sequelize.query(
        `SELECT 
          (SELECT COUNT(*) FROM quizzes WHERE creator_id = $1) as total_quizzes,
          (SELECT COUNT(*) FROM quiz_sessions WHERE host_id = $1) as total_sessions,
          (SELECT COUNT(DISTINCT sp.user_id) FROM session_participants sp 
           JOIN quiz_sessions qs ON sp.session_id = qs.id 
           WHERE qs.host_id = $1) as total_students,
          (SELECT AVG(sp.score) FROM session_participants sp 
           JOIN quiz_sessions qs ON sp.session_id = qs.id 
           WHERE qs.host_id = $1) as average_score,
          (SELECT COUNT(*) FROM quizzes WHERE creator_id = $1 AND is_active = true) as active_quizzes,
          (SELECT COUNT(*) FROM quiz_sessions WHERE host_id = $1 AND status = 'scheduled') as upcoming_sessions`,
        {
          bind: [userId],
          type: QueryTypes.SELECT,
        }
      );

      // Calculate completion rate
      const [completionData]: any = await sequelize.query(
        `SELECT 
          COUNT(CASE WHEN sp.completed_at IS NOT NULL THEN 1 END) as completed,
          COUNT(*) as total
         FROM session_participants sp
         JOIN quiz_sessions qs ON sp.session_id = qs.id
         WHERE qs.host_id = $1`,
        {
          bind: [userId],
          type: QueryTypes.SELECT,
        }
      );

      const completionRate = completionData.total > 0 
        ? Math.round((completionData.completed / completionData.total) * 100)
        : 0;

      // Calculate growth rates (mock data for now)
      const weeklyGrowth = Math.floor(Math.random() * 20) - 5; // Random between -5 and 15
      const monthlyGrowth = Math.floor(Math.random() * 30) - 10; // Random between -10 and 20

      stats = {
        totalQuizzes: parseInt(basicStats.total_quizzes) || 0,
        totalSessions: parseInt(basicStats.total_sessions) || 0,
        totalStudents: parseInt(basicStats.total_students) || 0,
        averageScore: Math.round(parseFloat(basicStats.average_score) || 0),
        completionRate,
        activeQuizzes: parseInt(basicStats.active_quizzes) || 0,
        upcomingSessions: parseInt(basicStats.upcoming_sessions) || 0,
        recentActivities: 0, // Will be calculated separately
        weeklyGrowth,
        monthlyGrowth,
      };
    } else {
      // Student statistics
      const [studentStats]: any = await sequelize.query(
        `SELECT 
          COUNT(DISTINCT qs.quiz_id) as total_quizzes,
          COUNT(DISTINCT sp.session_id) as total_sessions,
          AVG(sp.score) as average_score
         FROM session_participants sp
         LEFT JOIN quiz_sessions qs ON sp.session_id = qs.id
         WHERE sp.user_id = $1`,
        {
          bind: [userId],
          type: QueryTypes.SELECT,
        }
      );

      stats = {
        totalQuizzes: parseInt(studentStats.total_quizzes) || 0,
        totalSessions: parseInt(studentStats.total_sessions) || 0,
        totalStudents: 0,
        averageScore: Math.round(parseFloat(studentStats.average_score) || 0),
        completionRate: 100,
        activeQuizzes: 0,
        upcomingSessions: 0,
        recentActivities: 0,
        weeklyGrowth: 5,
        monthlyGrowth: 12,
      };
    }

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
};

export const getDashboardActivities = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  try {
    const activities = await sequelize.query(
      `(SELECT 
          'quiz_created' as type,
          q.title as title,
          'Created a new quiz' as description,
          q.created_at as timestamp
        FROM quizzes q
        WHERE q.creator_id = $1
        ORDER BY q.created_at DESC
        LIMIT 5)
       UNION ALL
       (SELECT 
          'session_hosted' as type,
          qs.name as title,
          'Hosted a quiz session' as description,
          qs.created_at as timestamp
        FROM quiz_sessions qs
        WHERE qs.host_id = $1
        ORDER BY qs.created_at DESC
        LIMIT 5)
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
        LIMIT 5)
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
    console.error('Error fetching dashboard activities:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch activities' });
  }
};

export const getUpcomingSessions = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;

  try {
    let sessions;

    if (userRole === 'teacher' || userRole === 'admin') {
      // Get teacher's upcoming sessions
      sessions = await sequelize.query(
        `SELECT 
          qs.id,
          qs.name as title,
          q.title as quiz_title,
          qs.scheduled_for,
          (SELECT COUNT(*) FROM session_participants WHERE session_id = qs.id) as participants_count,
          CASE 
            WHEN qs.status = 'in_progress' THEN 'in_progress'
            WHEN qs.scheduled_for <= NOW() + INTERVAL '15 minutes' THEN 'starting_soon'
            ELSE 'scheduled'
          END as status
         FROM quiz_sessions qs
         JOIN quizzes q ON qs.quiz_id = q.id
         WHERE qs.host_id = $1 
           AND qs.status IN ('scheduled', 'waiting', 'in_progress')
         ORDER BY qs.scheduled_for ASC
         LIMIT 5`,
        {
          bind: [userId],
          type: QueryTypes.SELECT,
        }
      );
    } else {
      // Get sessions the student can join
      sessions = await sequelize.query(
        `SELECT 
          qs.id,
          qs.name as title,
          q.title as quiz_title,
          qs.scheduled_for,
          (SELECT COUNT(*) FROM session_participants WHERE session_id = qs.id) as participants_count,
          CASE 
            WHEN qs.status = 'in_progress' THEN 'in_progress'
            WHEN qs.scheduled_for <= NOW() + INTERVAL '15 minutes' THEN 'starting_soon'
            ELSE 'scheduled'
          END as status
         FROM quiz_sessions qs
         JOIN quizzes q ON qs.quiz_id = q.id
         WHERE qs.status IN ('scheduled', 'waiting', 'in_progress')
           AND qs.id NOT IN (
             SELECT session_id FROM session_participants WHERE user_id = $1
           )
         ORDER BY qs.scheduled_for ASC
         LIMIT 5`,
        {
          bind: [userId],
          type: QueryTypes.SELECT,
        }
      );
    }

    // Format the sessions
    const formattedSessions = (sessions as any[]).map(session => ({
      id: session.id,
      title: session.title,
      quizTitle: session.quiz_title,
      scheduledFor: session.scheduled_for || new Date().toISOString(),
      participantsCount: parseInt(session.participants_count) || 0,
      status: session.status,
    }));

    res.json({
      success: true,
      data: formattedSessions,
    });
  } catch (error) {
    console.error('Error fetching upcoming sessions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch upcoming sessions' });
  }
};

export const getDashboardNotifications = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  try {
    // Mock notifications for now (you can implement a real notification system later)
    const notifications = [
      {
        id: 1,
        type: 'success',
        title: 'Quiz Completed',
        message: 'Your Math Quiz has been completed by 25 students',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        read: false,
      },
      {
        id: 2,
        type: 'info',
        title: 'New Student Joined',
        message: 'John Doe has joined your Science Quiz session',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
        read: false,
      },
      {
        id: 3,
        type: 'warning',
        title: 'Session Starting Soon',
        message: 'Your History Quiz session starts in 15 minutes',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        read: true,
      },
      {
        id: 4,
        type: 'info',
        title: 'Weekly Report',
        message: 'Your weekly performance report is ready',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        read: true,
      },
    ];

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

export const getDashboardPerformance = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  try {
    // Mock performance data for charts
    const performanceData = {
      weeklyLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      weeklySessions: [12, 19, 15, 25, 22, 30, 28],
      weeklyParticipants: [65, 89, 76, 125, 110, 145, 132],
      quizLabels: ['Math', 'Science', 'History', 'English', 'Geography'],
      quizScores: [85, 78, 92, 88, 75],
      completionData: [65, 25, 10], // Completed, In Progress, Not Started
    };

    res.json({
      success: true,
      data: performanceData,
    });
  } catch (error) {
    console.error('Error fetching performance data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch performance data' });
  }
};