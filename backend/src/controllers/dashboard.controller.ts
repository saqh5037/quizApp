import { Request, Response } from 'express';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

export const getDashboardStats = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;

  try {
    let stats: any = {};

    if (userRole === 'teacher' || userRole === 'admin') {
      // Comprehensive Admin/Teacher Dashboard Stats
      const [basicStats]: any = await sequelize.query(
        `SELECT 
          -- Quiz Statistics
          (SELECT COUNT(*) FROM quizzes) as total_quizzes,
          (SELECT COUNT(*) FROM quizzes WHERE is_active = true) as active_quizzes,
          (SELECT COUNT(*) FROM quizzes WHERE is_public = true) as public_quizzes,
          (SELECT COUNT(*) FROM quizzes WHERE creator_id = $1) as my_quizzes,
          
          -- Session Statistics
          (SELECT COUNT(*) FROM quiz_sessions) as total_sessions,
          (SELECT COUNT(*) FROM quiz_sessions WHERE status = 'completed') as completed_sessions,
          (SELECT COUNT(*) FROM quiz_sessions WHERE status = 'in_progress') as active_sessions,
          (SELECT COUNT(*) FROM quiz_sessions WHERE status = 'scheduled' AND scheduled_for > NOW()) as upcoming_sessions,
          
          -- Participation Statistics  
          (SELECT COUNT(DISTINCT participant_email) FROM public_quiz_results) as total_participants,
          (SELECT COUNT(*) FROM public_quiz_results) as total_responses,
          (SELECT COUNT(*) FROM public_quiz_results WHERE score >= (total_points * 0.7)) as passed_responses,
          
          -- Performance Metrics
          (SELECT AVG(score) FROM public_quiz_results) as average_score,
          (SELECT AVG(total_points) FROM public_quiz_results) as average_total_points,
          (SELECT MAX(score) FROM public_quiz_results) as highest_score,
          
          -- Recent Activity (Last 7 days)
          (SELECT COUNT(*) FROM public_quiz_results WHERE completed_at >= NOW() - INTERVAL '7 days') as recent_responses,
          (SELECT COUNT(*) FROM quizzes WHERE created_at >= NOW() - INTERVAL '7 days') as recent_quizzes`,
        {
          bind: [userId],
          type: QueryTypes.SELECT,
        }
      );

      // Calculate additional metrics
      const totalResponses = parseInt(basicStats.total_responses) || 0;
      const passedResponses = parseInt(basicStats.passed_responses) || 0;
      const passRate = totalResponses > 0 ? Math.round((passedResponses / totalResponses) * 100) : 0;
      const recentActivity = parseInt(basicStats.recent_responses) || 0;
      const weeklyQuizGrowth = parseInt(basicStats.recent_quizzes) || 0;

      // Category Statistics
      const [categoryStats] = await sequelize.query(
        `SELECT 
          category,
          COUNT(*) as quiz_count,
          AVG(pqr.score) as avg_score
         FROM quizzes q
         LEFT JOIN public_quiz_results pqr ON q.id = pqr.quiz_id
         WHERE q.category IS NOT NULL
         GROUP BY category
         ORDER BY quiz_count DESC
         LIMIT 5`,
        { type: QueryTypes.SELECT }
      );

      stats = {
        // Quiz Metrics
        totalQuizzes: parseInt(basicStats.total_quizzes) || 0,
        activeQuizzes: parseInt(basicStats.active_quizzes) || 0,
        publicQuizzes: parseInt(basicStats.public_quizzes) || 0,
        myQuizzes: parseInt(basicStats.my_quizzes) || 0,
        
        // Session Metrics  
        totalSessions: parseInt(basicStats.total_sessions) || 0,
        completedSessions: parseInt(basicStats.completed_sessions) || 0,
        activeSessions: parseInt(basicStats.active_sessions) || 0,
        upcomingSessions: parseInt(basicStats.upcoming_sessions) || 0,
        
        // Participation Metrics
        totalParticipants: parseInt(basicStats.total_participants) || 0,
        totalResponses: totalResponses,
        passedResponses: passedResponses,
        failedResponses: totalResponses - passedResponses,
        
        // Performance Metrics
        averageScore: parseFloat(basicStats.average_score)?.toFixed(1) || '0.0',
        averageTotalPoints: parseFloat(basicStats.average_total_points)?.toFixed(1) || '0.0',
        highestScore: parseFloat(basicStats.highest_score)?.toFixed(1) || '0.0',
        passRate: passRate,
        
        // Activity Metrics
        recentActivity: recentActivity,
        weeklyGrowth: weeklyQuizGrowth,
        monthlyGrowth: Math.round(weeklyQuizGrowth * 4.3), // Estimate monthly from weekly
        
        // Category Data
        topCategories: categoryStats,
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
    // Real performance data from database
    
    // Weekly activity data (last 7 days)
    const weeklyData = await sequelize.query(
      `SELECT 
        TO_CHAR(completed_at, 'Dy') as day,
        DATE(completed_at) as date,
        COUNT(*) as responses,
        COUNT(DISTINCT participant_email) as participants,
        AVG(score) as avg_score
       FROM public_quiz_results 
       WHERE completed_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(completed_at), TO_CHAR(completed_at, 'Dy')
       ORDER BY date`,
      { type: QueryTypes.SELECT }
    );

    // Quiz performance by category
    const categoryPerformance = await sequelize.query(
      `SELECT 
        COALESCE(q.category, 'Uncategorized') as category,
        COUNT(pqr.id) as total_attempts,
        AVG(pqr.score) as avg_score,
        COUNT(CASE WHEN pqr.score >= (pqr.total_points * 0.7) THEN 1 END) as passed
       FROM quizzes q
       LEFT JOIN public_quiz_results pqr ON q.id = pqr.quiz_id
       WHERE pqr.id IS NOT NULL
       GROUP BY q.category
       ORDER BY total_attempts DESC
       LIMIT 5`,
      { type: QueryTypes.SELECT }
    );

    // Overall completion statistics
    const [completionStats]: any = await sequelize.query(
      `SELECT 
        COUNT(CASE WHEN score >= (total_points * 0.7) THEN 1 END) as passed,
        COUNT(CASE WHEN score < (total_points * 0.7) THEN 1 END) as failed,
        COUNT(*) as total
       FROM public_quiz_results`,
      { type: QueryTypes.SELECT }
    );

    // Monthly trends (last 6 months)
    const monthlyTrends = await sequelize.query(
      `SELECT 
        TO_CHAR(completed_at, 'Mon YYYY') as month,
        COUNT(*) as total_responses,
        COUNT(DISTINCT participant_email) as unique_participants,
        AVG(score) as avg_score
       FROM public_quiz_results 
       WHERE completed_at >= NOW() - INTERVAL '6 months'
       GROUP BY TO_CHAR(completed_at, 'Mon YYYY'), DATE_TRUNC('month', completed_at)
       ORDER BY DATE_TRUNC('month', completed_at)`,
      { type: QueryTypes.SELECT }
    );

    // Format data for charts - ensure arrays
    const weeklyArray = Array.isArray(weeklyData) ? weeklyData : [];
    const categoryArray = Array.isArray(categoryPerformance) ? categoryPerformance : [];
    const monthlyArray = Array.isArray(monthlyTrends) ? monthlyTrends : [];

    const weeklyLabels = weeklyArray.map((d: any) => d.day);
    const weeklyResponses = weeklyArray.map((d: any) => parseInt(d.responses));
    const weeklyParticipants = weeklyArray.map((d: any) => parseInt(d.participants));
    const weeklyAvgScores = weeklyArray.map((d: any) => parseFloat(d.avg_score || 0));

    const categoryLabels = categoryArray.map((c: any) => c.category);
    const categoryScores = categoryArray.map((c: any) => parseFloat(c.avg_score || 0));
    const categoryAttempts = categoryArray.map((c: any) => parseInt(c.total_attempts));

    const completionData = [
      parseInt(completionStats.passed) || 0,
      parseInt(completionStats.failed) || 0
    ];

    const monthlyLabels = monthlyArray.map((m: any) => m.month);
    const monthlyResponses = monthlyArray.map((m: any) => parseInt(m.total_responses));
    const monthlyParticipants = monthlyArray.map((m: any) => parseInt(m.unique_participants));

    const performanceData = {
      // Weekly Data
      weeklyLabels: weeklyLabels.length > 0 ? weeklyLabels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      weeklyResponses: weeklyResponses.length > 0 ? weeklyResponses : [0, 0, 0, 0, 0, 0, 0],
      weeklyParticipants: weeklyParticipants.length > 0 ? weeklyParticipants : [0, 0, 0, 0, 0, 0, 0],
      weeklyAvgScores: weeklyAvgScores.length > 0 ? weeklyAvgScores : [0, 0, 0, 0, 0, 0, 0],
      
      // Category Data
      categoryLabels: categoryLabels.length > 0 ? categoryLabels : ['General'],
      categoryScores: categoryScores.length > 0 ? categoryScores : [0],
      categoryAttempts: categoryAttempts.length > 0 ? categoryAttempts : [0],
      
      // Completion Data
      completionData: completionData,
      completionLabels: ['Aprobados', 'No Aprobados'],
      
      // Monthly Trends
      monthlyLabels: monthlyLabels.length > 0 ? monthlyLabels : ['This Month'],
      monthlyResponses: monthlyResponses.length > 0 ? monthlyResponses : [0],
      monthlyParticipants: monthlyParticipants.length > 0 ? monthlyParticipants : [0],
      
      // Additional metrics
      totalAttempts: parseInt(completionStats.total) || 0,
      passRate: completionStats.total > 0 ? Math.round((completionStats.passed / completionStats.total) * 100) : 0
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