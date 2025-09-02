import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../../config/database';
import Tenant from '../../models/Tenant.model';
import TenantStats from '../../models/TenantStats.model';
import User from '../../models/User.model';
import Quiz from '../../models/Quiz.model';
import QuizSession from '../../models/QuizSession.model';
import { Video } from '../../models/Video';
import Manual from '../../models/Manual.model';
import Classroom from '../../models/Classroom.model';
import AuditLog from '../../models/AuditLog.model';

export class DashboardAdminController {
  // GET /api/v1/admin/dashboard/overview
  static async getOverview(req: Request, res: Response) {
    try {
      console.log('Dashboard getOverview - Models imported:', {
        Tenant: !!Tenant,
        User: !!User,
        Quiz: !!Quiz,
        QuizSession: !!QuizSession,
        Video: !!Video,
        Manual: !!Manual,
        Classroom: !!Classroom
      });
      
      // Get system-wide statistics
      const [
        tenantCount,
        userCount,
        quizCount,
        sessionCount,
        videoCount,
        manualCount,
        classroomCount
      ] = await Promise.all([
        Tenant?.count() || 0,
        User?.count() || 0,
        Quiz?.count() || 0,
        QuizSession?.count() || 0,
        Video?.count() || 0,
        Manual?.count() || 0,
        Classroom?.count() || 0
      ]);

      // Get active statistics (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // For now, skip the active tenant count as the field is not being recognized
      const [
        activeTenants,
        activeUsers,
        recentSessions
      ] = await Promise.all([
        Tenant.count({
          where: {
            is_active: true
          }
        }),
        User.count({
          where: {
            lastLoginAt: {
              [Op.gte]: thirtyDaysAgo
            }
          }
        }),
        QuizSession.count({
          where: {
            created_at: {
              [Op.gte]: thirtyDaysAgo
            }
          }
        })
      ]);

      // Get storage usage
      const storageStats = await sequelize.query(`
        SELECT 
          SUM(v.file_size_bytes) as video_storage,
          COUNT(v.id) as video_count
        FROM videos v
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      const manualStorageStats = await sequelize.query(`
        SELECT 
          SUM(m.file_size) as manual_storage,
          COUNT(m.id) as manual_count
        FROM manuals m
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: {
          totals: {
            tenants: tenantCount,
            users: userCount,
            quizzes: quizCount,
            sessions: sessionCount,
            videos: videoCount,
            manuals: manualCount,
            classrooms: classroomCount
          },
          active: {
            tenants: activeTenants,
            users: activeUsers,
            recentSessions
          },
          storage: {
            videos: parseInt(storageStats[0].video_storage || '0'),
            manuals: parseInt(manualStorageStats[0].manual_storage || '0'),
            total: parseInt(storageStats[0].video_storage || '0') + 
                   parseInt(manualStorageStats[0].manual_storage || '0')
          }
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard overview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard overview'
      });
    }
  }

  // GET /api/v1/admin/dashboard/tenant-metrics
  static async getTenantMetrics(req: Request, res: Response) {
    try {
      const { period = '30d' } = req.query;

      let dateFilter = new Date();
      switch (period) {
        case '7d':
          dateFilter.setDate(dateFilter.getDate() - 7);
          break;
        case '30d':
          dateFilter.setDate(dateFilter.getDate() - 30);
          break;
        case '90d':
          dateFilter.setDate(dateFilter.getDate() - 90);
          break;
        case '1y':
          dateFilter.setFullYear(dateFilter.getFullYear() - 1);
          break;
      }

      // Get tenant growth
      const tenantGrowth = await sequelize.query(`
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as new_tenants,
          SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('day', created_at)) as cumulative_tenants
        FROM tenants
        WHERE created_at >= :dateFilter
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date
      `, {
        replacements: { dateFilter },
        type: sequelize.QueryTypes.SELECT
      });

      // Get subscription distribution
      const subscriptionDistribution = await Tenant.findAll({
        attributes: [
          'subscription_plan',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['subscription_plan'],
        raw: true
      });

      // Get top tenants by usage
      const topTenants = await sequelize.query(`
        SELECT 
          t.id,
          t.name,
          t.subdomain,
          t.subscription_plan,
          COUNT(DISTINCT u.id) as user_count,
          COUNT(DISTINCT q.id) as quiz_count,
          COUNT(DISTINCT qs.id) as session_count,
          COUNT(DISTINCT v.id) as video_count
        FROM tenants t
        LEFT JOIN users u ON t.id = u.tenant_id
        LEFT JOIN quizzes q ON t.id = q.tenant_id
        LEFT JOIN quiz_sessions qs ON q.id = qs.quiz_id
        LEFT JOIN videos v ON t.id = v.tenant_id
        GROUP BY t.id, t.name, t.subdomain, t.subscription_plan
        ORDER BY session_count DESC
        LIMIT 10
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: {
          growth: tenantGrowth,
          subscriptionDistribution,
          topTenants
        }
      });
    } catch (error) {
      console.error('Error fetching tenant metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tenant metrics'
      });
    }
  }

  // GET /api/v1/admin/dashboard/usage-trends
  static async getUsageTrends(req: Request, res: Response) {
    try {
      const { period = '30d', tenant_id } = req.query;

      let dateFilter = new Date();
      switch (period) {
        case '7d':
          dateFilter.setDate(dateFilter.getDate() - 7);
          break;
        case '30d':
          dateFilter.setDate(dateFilter.getDate() - 30);
          break;
        case '90d':
          dateFilter.setDate(dateFilter.getDate() - 90);
          break;
      }

      let tenantFilter = '';
      const replacements: any = { dateFilter };
      
      if (tenant_id) {
        tenantFilter = 'AND q.tenant_id = :tenantId';
        replacements.tenantId = tenant_id;
      }

      // Get session trends
      const sessionTrends = await sequelize.query(`
        SELECT 
          DATE_TRUNC('day', qs.created_at) as date,
          COUNT(DISTINCT qs.id) as sessions,
          COUNT(DISTINCT p.id) as participants,
          AVG(CASE 
            WHEN qs.status = 'completed' 
            THEN EXTRACT(EPOCH FROM (qs.ended_at - qs.started_at))/60 
            ELSE NULL 
          END) as avg_duration_minutes
        FROM quiz_sessions qs
        JOIN quizzes q ON qs.quiz_id = q.id
        LEFT JOIN participants p ON qs.id = p.session_id
        WHERE qs.created_at >= :dateFilter ${tenantFilter}
        GROUP BY DATE_TRUNC('day', qs.created_at)
        ORDER BY date
      `, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      // Get content creation trends
      const contentTrends = await sequelize.query(`
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          'quiz' as content_type,
          COUNT(*) as count
        FROM quizzes
        WHERE created_at >= :dateFilter ${tenant_id ? 'AND tenant_id = :tenantId' : ''}
        GROUP BY DATE_TRUNC('day', created_at)
        
        UNION ALL
        
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          'video' as content_type,
          COUNT(*) as count
        FROM videos
        WHERE created_at >= :dateFilter ${tenant_id ? 'AND tenant_id = :tenantId' : ''}
        GROUP BY DATE_TRUNC('day', created_at)
        
        UNION ALL
        
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          'manual' as content_type,
          COUNT(*) as count
        FROM manuals
        WHERE created_at >= :dateFilter ${tenant_id ? 'AND tenant_id = :tenantId' : ''}
        GROUP BY DATE_TRUNC('day', created_at)
        
        ORDER BY date, content_type
      `, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      // Get user activity trends
      const userActivityTrends = await sequelize.query(`
        SELECT 
          DATE_TRUNC('day', last_login_at) as date,
          COUNT(DISTINCT id) as active_users
        FROM users
        WHERE last_login_at >= :dateFilter ${tenant_id ? 'AND tenant_id = :tenantId' : ''}
        GROUP BY DATE_TRUNC('day', last_login_at)
        ORDER BY date
      `, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: {
          sessions: sessionTrends,
          content: contentTrends,
          userActivity: userActivityTrends
        }
      });
    } catch (error) {
      console.error('Error fetching usage trends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch usage trends'
      });
    }
  }

  // GET /api/v1/admin/dashboard/system-health
  static async getSystemHealth(req: Request, res: Response) {
    try {
      // Check database connection
      const dbHealth = await sequelize.authenticate()
        .then(() => ({ status: 'healthy', message: 'Database connected' }))
        .catch(err => ({ status: 'unhealthy', message: err.message }));

      // Get error logs from last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const recentErrors = await AuditLog.count({
        where: {
          action: {
            [Op.like]: '%ERROR%'
          },
          created_at: {
            [Op.gte]: yesterday
          }
        }
      });

      // Get system resource usage
      const resourceUsage = await sequelize.query(`
        SELECT 
          (SELECT COUNT(*) FROM users WHERE last_login_at >= NOW() - INTERVAL '5 minutes') as active_users_5min,
          (SELECT COUNT(*) FROM quiz_sessions WHERE status = 'active') as active_sessions,
          (SELECT pg_database_size(current_database())) as database_size,
          (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') as active_connections
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      // Get failed login attempts
      const failedLogins = await AuditLog.count({
        where: {
          action: 'LOGIN_FAILED',
          created_at: {
            [Op.gte]: yesterday
          }
        }
      });

      // Get API response times (if tracked)
      const apiMetrics = await sequelize.query(`
        SELECT 
          AVG(CASE WHEN action LIKE '%API%' THEN 
            EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000 
          END) as avg_response_time_ms,
          COUNT(CASE WHEN action LIKE '%API%' THEN 1 END) as total_api_calls
        FROM audit_logs
        WHERE created_at >= :yesterday
      `, {
        replacements: { yesterday },
        type: sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: {
          database: dbHealth,
          errors: {
            last24Hours: recentErrors,
            failedLogins
          },
          resources: resourceUsage[0],
          api: apiMetrics[0],
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Error fetching system health:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch system health'
      });
    }
  }

  // GET /api/v1/admin/dashboard/recent-activity
  static async getRecentActivity(req: Request, res: Response) {
    try {
      const { limit = 50, tenant_id, user_id } = req.query;

      // For now, return recent actions from different tables until AuditLog is fixed
      const activities = [];

      // Recent user registrations
      const recentUsers = await User.findAll({
        limit: 10,
        order: [['created_at', 'DESC']],
        where: tenant_id ? { tenant_id } : {},
        attributes: ['id', 'email', 'first_name', 'last_name', 'created_at', 'tenant_id']
      });

      recentUsers.forEach(user => {
        activities.push({
          id: `user_${user.id}`,
          action: 'USER_CREATED',
          entity_type: 'User',
          entity_id: user.id,
          user_id: user.id,
          tenant_id: user.tenant_id,
          created_at: user.created_at,
          metadata: {
            user_email: user.email,
            user_name: `${user.first_name} ${user.last_name}`.trim()
          }
        });
      });

      // Recent quiz creations
      const recentQuizzes = await Quiz.findAll({
        limit: 10,
        order: [['created_at', 'DESC']],
        where: tenant_id ? { tenant_id } : {},
        attributes: ['id', 'title', 'created_at', 'tenant_id', 'creator_id']
      });

      recentQuizzes.forEach(quiz => {
        activities.push({
          id: `quiz_${quiz.id}`,
          action: 'QUIZ_CREATED',
          entity_type: 'Quiz',
          entity_id: quiz.id,
          user_id: quiz.creator_id,
          tenant_id: quiz.tenant_id,
          created_at: quiz.created_at,
          metadata: {
            quiz_title: quiz.title
          }
        });
      });

      // Recent sessions
      const recentSessions = await QuizSession.findAll({
        limit: 10,
        order: [['created_at', 'DESC']],
        where: tenant_id ? { tenant_id } : {},
        attributes: ['id', 'sessionCode', 'status', 'created_at', 'tenant_id', 'hostId']
      });

      recentSessions.forEach(session => {
        activities.push({
          id: `session_${session.id}`,
          action: 'SESSION_CREATED',
          entity_type: 'QuizSession',
          entity_id: session.id,
          user_id: session.hostId,
          tenant_id: session.tenant_id,
          created_at: session.created_at,
          metadata: {
            session_code: session.sessionCode,
            status: session.status
          }
        });
      });

      // Sort all activities by date
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Apply limit
      const limitedActivities = activities.slice(0, parseInt(limit as string));

      res.json({
        success: true,
        data: limitedActivities
      });
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recent activity'
      });
    }
  }

  // GET /api/v1/admin/dashboard/alerts
  static async getAlerts(req: Request, res: Response) {
    try {
      const alerts = [];

      // Check for tenants approaching limits
      const tenantsNearLimits = await sequelize.query(`
        SELECT 
          t.id,
          t.name,
          t.subscription_plan,
          t.settings,
          COUNT(DISTINCT u.id) as user_count,
          COALESCE(SUM(v.file_size_bytes), 0) as storage_used
        FROM tenants t
        LEFT JOIN users u ON t.id = u.tenant_id
        LEFT JOIN videos v ON t.id = v.tenant_id
        WHERE t.is_active = true
        GROUP BY t.id, t.name, t.subscription_plan, t.settings
        HAVING 
          (t.settings->>'maxUsers' IS NOT NULL AND 
           COUNT(DISTINCT u.id) >= (t.settings->>'maxUsers')::int * 0.9)
          OR
          (t.settings->>'maxStorage' IS NOT NULL AND 
           COALESCE(SUM(v.file_size_bytes), 0) >= (t.settings->>'maxStorage')::bigint * 0.9)
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      tenantsNearLimits.forEach((tenant: any) => {
        if (tenant.settings?.maxUsers && tenant.user_count >= tenant.settings.maxUsers * 0.9) {
          alerts.push({
            type: 'warning',
            category: 'limit',
            message: `Tenant "${tenant.name}" is approaching user limit (${tenant.user_count}/${tenant.settings.maxUsers})`,
            tenant_id: tenant.id,
            timestamp: new Date()
          });
        }
        if (tenant.settings?.maxStorage && tenant.storage_used >= tenant.settings.maxStorage * 0.9) {
          alerts.push({
            type: 'warning',
            category: 'storage',
            message: `Tenant "${tenant.name}" is approaching storage limit`,
            tenant_id: tenant.id,
            timestamp: new Date()
          });
        }
      });

      // Check for expiring subscriptions (simplified)
      const expiringCount = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM tenants 
        WHERE subscription_expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'
        AND is_active = true
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      if (expiringCount[0]?.count > 0) {
        alerts.push({
          type: 'warning',
          category: 'subscription',
          message: `${expiringCount[0].count} tenant subscription(s) expiring within 30 days`,
          timestamp: new Date()
        });
      }

      // Check for inactive tenants
      const inactiveCount = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM tenants 
        WHERE (last_active_at < NOW() - INTERVAL '30 days' OR last_active_at IS NULL)
        AND is_active = true
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      if (inactiveCount[0]?.count > 0) {
        alerts.push({
          type: 'info',
          category: 'engagement',
          message: `${inactiveCount[0].count} tenant(s) have been inactive for over 30 days`,
          timestamp: new Date()
        });
      }

      // System health check - check for high session count
      const activeSessionCount = await QuizSession.count({
        where: {
          status: 'active'
        }
      });

      if (activeSessionCount > 50) {
        alerts.push({
          type: 'info',
          category: 'system',
          message: `High system load: ${activeSessionCount} active quiz sessions`,
          timestamp: new Date()
        });
      }

      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch alerts'
      });
    }
  }
}

export default DashboardAdminController;