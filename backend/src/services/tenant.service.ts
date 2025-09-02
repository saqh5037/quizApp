import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import Tenant from '../models/Tenant.model';
import TenantStats from '../models/TenantStats.model';
import User from '../models/User.model';
import Quiz from '../models/Quiz.model';
import Video from '../models/Video';
import Manual from '../models/Manual.model';
import Classroom from '../models/Classroom.model';
import QuizSession from '../models/QuizSession.model';

export interface TenantSettings {
  maxUsers?: number;
  maxStorage?: number;
  maxQuizzes?: number;
  maxVideos?: number;
  maxManuals?: number;
  maxClassrooms?: number;
  features?: string[];
  allowPublicQuizzes?: boolean;
  allowVideoUpload?: boolean;
  allowAIFeatures?: boolean;
  aiCreditsMonthly?: number;
  customBranding?: boolean;
  whiteLabel?: boolean;
}

export interface SubscriptionPlan {
  name: 'free' | 'basic' | 'premium' | 'enterprise';
  maxUsers: number;
  maxStorage: number; // in bytes
  maxQuizzes: number;
  maxVideos: number;
  maxManuals: number;
  maxClassrooms: number;
  features: string[];
  aiCreditsMonthly: number;
}

const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  free: {
    name: 'free',
    maxUsers: 10,
    maxStorage: 1024 * 1024 * 1024, // 1GB
    maxQuizzes: 10,
    maxVideos: 5,
    maxManuals: 5,
    maxClassrooms: 1,
    features: ['basic_quizzes', 'basic_reports'],
    aiCreditsMonthly: 10
  },
  basic: {
    name: 'basic',
    maxUsers: 50,
    maxStorage: 10 * 1024 * 1024 * 1024, // 10GB
    maxQuizzes: 100,
    maxVideos: 50,
    maxManuals: 50,
    maxClassrooms: 5,
    features: ['basic_quizzes', 'advanced_reports', 'video_streaming', 'ai_quiz_generation'],
    aiCreditsMonthly: 100
  },
  premium: {
    name: 'premium',
    maxUsers: 200,
    maxStorage: 100 * 1024 * 1024 * 1024, // 100GB
    maxQuizzes: 1000,
    maxVideos: 500,
    maxManuals: 500,
    maxClassrooms: 20,
    features: [
      'basic_quizzes',
      'advanced_reports',
      'video_streaming',
      'ai_quiz_generation',
      'interactive_videos',
      'custom_branding',
      'api_access'
    ],
    aiCreditsMonthly: 1000
  },
  enterprise: {
    name: 'enterprise',
    maxUsers: -1, // unlimited
    maxStorage: -1, // unlimited
    maxQuizzes: -1,
    maxVideos: -1,
    maxManuals: -1,
    maxClassrooms: -1,
    features: [
      'basic_quizzes',
      'advanced_reports',
      'video_streaming',
      'ai_quiz_generation',
      'interactive_videos',
      'custom_branding',
      'white_label',
      'api_access',
      'priority_support',
      'custom_integrations'
    ],
    aiCreditsMonthly: -1 // unlimited
  }
};

export class TenantService {
  /**
   * Create a new tenant with default settings based on subscription plan
   */
  static async createTenant(
    name: string,
    subdomain: string,
    ownerEmail: string,
    subscriptionPlan: string = 'free',
    customSettings?: Partial<TenantSettings>
  ): Promise<Tenant> {
    const plan = SUBSCRIPTION_PLANS[subscriptionPlan] || SUBSCRIPTION_PLANS.free;
    
    // Generate default settings based on plan
    const defaultSettings: TenantSettings = {
      maxUsers: plan.maxUsers,
      maxStorage: plan.maxStorage,
      maxQuizzes: plan.maxQuizzes,
      maxVideos: plan.maxVideos,
      maxManuals: plan.maxManuals,
      maxClassrooms: plan.maxClassrooms,
      features: plan.features,
      allowPublicQuizzes: plan.features.includes('public_quizzes'),
      allowVideoUpload: plan.features.includes('video_streaming'),
      allowAIFeatures: plan.features.includes('ai_quiz_generation'),
      aiCreditsMonthly: plan.aiCreditsMonthly,
      customBranding: plan.features.includes('custom_branding'),
      whiteLabel: plan.features.includes('white_label')
    };

    // Merge with custom settings if provided
    const settings = { ...defaultSettings, ...customSettings };

    // Calculate subscription expiration (30 days for trial, 1 year for paid)
    const subscriptionExpiresAt = new Date();
    if (subscriptionPlan === 'free') {
      subscriptionExpiresAt.setDate(subscriptionExpiresAt.getDate() + 30);
    } else {
      subscriptionExpiresAt.setFullYear(subscriptionExpiresAt.getFullYear() + 1);
    }

    const tenant = await Tenant.create({
      name,
      subdomain,
      domain: null,
      subscription_plan: subscriptionPlan,
      subscription_expires_at: subscriptionExpiresAt,
      settings,
      is_active: true,
      last_active_at: new Date()
    });

    // Create initial stats record
    await TenantStats.create({
      tenant_id: tenant.id,
      users_count: 0,
      quizzes_count: 0,
      sessions_count: 0,
      videos_count: 0,
      manuals_count: 0,
      classrooms_count: 0,
      storage_used: 0,
      ai_credits_used: 0
    });

    return tenant;
  }

  /**
   * Update tenant subscription plan
   */
  static async updateSubscriptionPlan(
    tenantId: number,
    newPlan: string
  ): Promise<Tenant> {
    const tenant = await Tenant.findByPk(tenantId);
    
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const plan = SUBSCRIPTION_PLANS[newPlan];
    if (!plan) {
      throw new Error('Invalid subscription plan');
    }

    // Update settings based on new plan
    const newSettings: TenantSettings = {
      ...tenant.settings,
      maxUsers: plan.maxUsers,
      maxStorage: plan.maxStorage,
      maxQuizzes: plan.maxQuizzes,
      maxVideos: plan.maxVideos,
      maxManuals: plan.maxManuals,
      maxClassrooms: plan.maxClassrooms,
      features: plan.features,
      allowPublicQuizzes: plan.features.includes('public_quizzes'),
      allowVideoUpload: plan.features.includes('video_streaming'),
      allowAIFeatures: plan.features.includes('ai_quiz_generation'),
      aiCreditsMonthly: plan.aiCreditsMonthly,
      customBranding: plan.features.includes('custom_branding'),
      whiteLabel: plan.features.includes('white_label')
    };

    // Calculate new expiration date
    const subscriptionExpiresAt = new Date();
    subscriptionExpiresAt.setFullYear(subscriptionExpiresAt.getFullYear() + 1);

    await tenant.update({
      subscription_plan: newPlan,
      subscription_expires_at: subscriptionExpiresAt,
      settings: newSettings
    });

    return tenant;
  }

  /**
   * Check if tenant has reached resource limits
   */
  static async checkResourceLimits(tenantId: number): Promise<{
    withinLimits: boolean;
    limits: any;
    usage: any;
    warnings: string[];
  }> {
    const tenant = await Tenant.findByPk(tenantId);
    
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const warnings: string[] = [];
    const settings = tenant.settings || {};

    // Get current usage
    const [
      userCount,
      quizCount,
      videoCount,
      manualCount,
      classroomCount,
      storageUsed
    ] = await Promise.all([
      User.count({ where: { tenant_id: tenantId } }),
      Quiz.count({ where: { tenant_id: tenantId } }),
      Video.count({ where: { tenant_id: tenantId } }),
      Manual.count({ where: { tenant_id: tenantId } }),
      Classroom.count({ where: { tenant_id: tenantId } }),
      this.calculateStorageUsed(tenantId)
    ]);

    const usage = {
      users: userCount,
      quizzes: quizCount,
      videos: videoCount,
      manuals: manualCount,
      classrooms: classroomCount,
      storage: storageUsed
    };

    const limits = {
      maxUsers: settings.maxUsers || -1,
      maxQuizzes: settings.maxQuizzes || -1,
      maxVideos: settings.maxVideos || -1,
      maxManuals: settings.maxManuals || -1,
      maxClassrooms: settings.maxClassrooms || -1,
      maxStorage: settings.maxStorage || -1
    };

    // Check limits
    let withinLimits = true;

    if (limits.maxUsers > 0 && userCount >= limits.maxUsers) {
      warnings.push(`User limit reached (${userCount}/${limits.maxUsers})`);
      withinLimits = false;
    } else if (limits.maxUsers > 0 && userCount >= limits.maxUsers * 0.9) {
      warnings.push(`Approaching user limit (${userCount}/${limits.maxUsers})`);
    }

    if (limits.maxQuizzes > 0 && quizCount >= limits.maxQuizzes) {
      warnings.push(`Quiz limit reached (${quizCount}/${limits.maxQuizzes})`);
      withinLimits = false;
    }

    if (limits.maxStorage > 0 && storageUsed >= limits.maxStorage) {
      warnings.push(`Storage limit reached`);
      withinLimits = false;
    } else if (limits.maxStorage > 0 && storageUsed >= limits.maxStorage * 0.9) {
      warnings.push(`Approaching storage limit`);
    }

    // Update stats
    await TenantStats.upsert({
      tenant_id: tenantId,
      users_count: userCount,
      quizzes_count: quizCount,
      sessions_count: await QuizSession.count({
        include: [{
          model: Quiz,
          where: { tenant_id: tenantId }
        }]
      }),
      videos_count: videoCount,
      manuals_count: manualCount,
      classrooms_count: classroomCount,
      storage_used: storageUsed,
      last_updated: new Date()
    });

    return {
      withinLimits,
      limits,
      usage,
      warnings
    };
  }

  /**
   * Calculate storage used by tenant
   */
  static async calculateStorageUsed(tenantId: number): Promise<number> {
    const result = await sequelize.query(`
      SELECT 
        COALESCE(SUM(v.file_size), 0) + COALESCE(SUM(m.file_size), 0) as total_storage
      FROM 
        (SELECT file_size FROM videos WHERE tenant_id = :tenantId) v,
        (SELECT file_size FROM manuals WHERE tenant_id = :tenantId) m
    `, {
      replacements: { tenantId },
      type: sequelize.QueryTypes.SELECT
    });

    return parseInt(result[0]?.total_storage || '0');
  }

  /**
   * Check if a feature is enabled for tenant
   */
  static async isFeatureEnabled(
    tenantId: number,
    feature: string
  ): Promise<boolean> {
    const tenant = await Tenant.findByPk(tenantId);
    
    if (!tenant || !tenant.is_active) {
      return false;
    }

    const features = tenant.settings?.features || [];
    return features.includes(feature);
  }

  /**
   * Get tenant usage statistics
   */
  static async getTenantStatistics(tenantId: number): Promise<any> {
    const tenant = await Tenant.findByPk(tenantId);
    
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const stats = await TenantStats.findOne({
      where: { tenant_id: tenantId }
    });

    const resourceLimits = await this.checkResourceLimits(tenantId);

    // Get activity trends
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activityTrends = await sequelize.query(`
      SELECT 
        DATE_TRUNC('day', qs.created_at) as date,
        COUNT(DISTINCT qs.id) as sessions,
        COUNT(DISTINCT p.id) as participants
      FROM quiz_sessions qs
      JOIN quizzes q ON qs.quiz_id = q.id
      LEFT JOIN participants p ON qs.id = p.session_id
      WHERE q.tenant_id = :tenantId
        AND qs.created_at >= :startDate
      GROUP BY DATE_TRUNC('day', qs.created_at)
      ORDER BY date
    `, {
      replacements: { tenantId, startDate: thirtyDaysAgo },
      type: sequelize.QueryTypes.SELECT
    });

    return {
      tenant,
      stats,
      resourceLimits,
      activityTrends
    };
  }

  /**
   * Deactivate expired tenants
   */
  static async deactivateExpiredTenants(): Promise<number> {
    const result = await Tenant.update(
      { is_active: false },
      {
        where: {
          subscription_expires_at: {
            [Op.lt]: new Date()
          },
          is_active: true
        }
      }
    );

    return result[0]; // Number of affected rows
  }

  /**
   * Send expiration warnings
   */
  static async getExpiringTenants(daysBeforeExpiry: number = 7): Promise<Tenant[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysBeforeExpiry);

    return Tenant.findAll({
      where: {
        subscription_expires_at: {
          [Op.between]: [new Date(), expiryDate]
        },
        is_active: true
      }
    });
  }

  /**
   * Migrate tenant data to another tenant (for mergers)
   */
  static async migrateTenantData(
    sourceTenantId: number,
    targetTenantId: number
  ): Promise<void> {
    const t = await sequelize.transaction();

    try {
      // Update all related records
      await Promise.all([
        User.update(
          { tenant_id: targetTenantId },
          { where: { tenant_id: sourceTenantId }, transaction: t }
        ),
        Quiz.update(
          { tenant_id: targetTenantId },
          { where: { tenant_id: sourceTenantId }, transaction: t }
        ),
        Video.update(
          { tenant_id: targetTenantId },
          { where: { tenant_id: sourceTenantId }, transaction: t }
        ),
        Manual.update(
          { tenant_id: targetTenantId },
          { where: { tenant_id: sourceTenantId }, transaction: t }
        ),
        Classroom.update(
          { tenant_id: targetTenantId },
          { where: { tenant_id: sourceTenantId }, transaction: t }
        )
      ]);

      // Deactivate source tenant
      await Tenant.update(
        { is_active: false },
        { where: { id: sourceTenantId }, transaction: t }
      );

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Clean up tenant data (GDPR compliance)
   */
  static async deleteTenantData(tenantId: number): Promise<void> {
    const t = await sequelize.transaction();

    try {
      // Delete in correct order to respect foreign key constraints
      // First delete dependent records
      const quizIds = await Quiz.findAll({
        where: { tenant_id: tenantId },
        attributes: ['id'],
        raw: true
      });

      if (quizIds.length > 0) {
        await QuizSession.destroy({
          where: { quiz_id: quizIds.map(q => q.id) },
          transaction: t
        });
      }

      // Then delete main records
      await Promise.all([
        Quiz.destroy({ where: { tenant_id: tenantId }, transaction: t }),
        Video.destroy({ where: { tenant_id: tenantId }, transaction: t }),
        Manual.destroy({ where: { tenant_id: tenantId }, transaction: t }),
        Classroom.destroy({ where: { tenant_id: tenantId }, transaction: t }),
        User.destroy({ where: { tenant_id: tenantId }, transaction: t })
      ]);

      // Finally delete the tenant
      await TenantStats.destroy({ where: { tenant_id: tenantId }, transaction: t });
      await Tenant.destroy({ where: { id: tenantId }, transaction: t });

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export default TenantService;