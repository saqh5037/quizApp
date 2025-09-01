import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

interface TenantStatsAttributes {
  tenant_id: number;
  total_users: number;
  total_quizzes: number;
  total_sessions: number;
  total_videos: number;
  total_manuals: number;
  total_classrooms: number;
  storage_used_mb: number;
  ai_credits_used: number;
  last_activity?: Date;
  updated_at?: Date;
}

interface TenantStatsCreationAttributes extends Optional<TenantStatsAttributes, 
  'total_users' | 'total_quizzes' | 'total_sessions' | 'total_videos' | 
  'total_manuals' | 'total_classrooms' | 'storage_used_mb' | 'ai_credits_used'> {}

class TenantStats extends Model<TenantStatsAttributes, TenantStatsCreationAttributes> implements TenantStatsAttributes {
  public tenant_id!: number;
  public total_users!: number;
  public total_quizzes!: number;
  public total_sessions!: number;
  public total_videos!: number;
  public total_manuals!: number;
  public total_classrooms!: number;
  public storage_used_mb!: number;
  public ai_credits_used!: number;
  public last_activity?: Date;
  public readonly updated_at!: Date;

  // Associations
  static associate(models: any) {
    TenantStats.belongsTo(models.Tenant, {
      foreignKey: 'tenant_id',
      as: 'tenant'
    });
  }

  static initModel(sequelize: Sequelize): typeof TenantStats {
    TenantStats.init(
      {
        tenant_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          references: {
            model: 'tenants',
            key: 'id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        total_users: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        total_quizzes: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        total_sessions: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        total_videos: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        total_manuals: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        total_classrooms: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        storage_used_mb: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        ai_credits_used: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        last_activity: {
          type: DataTypes.DATE,
          allowNull: true
        }
      },
      {
        sequelize,
        modelName: 'TenantStats',
        tableName: 'tenant_stats',
        underscored: true,
        timestamps: false,
        hooks: {
          beforeSave: (stats: TenantStats) => {
            stats.setDataValue('updated_at', new Date());
          }
        }
      }
    );

    return TenantStats;
  }

  // Helper methods to update stats
  async incrementUsers(count: number = 1): Promise<void> {
    this.total_users += count;
    await this.save();
  }

  async incrementQuizzes(count: number = 1): Promise<void> {
    this.total_quizzes += count;
    await this.save();
  }

  async incrementSessions(count: number = 1): Promise<void> {
    this.total_sessions += count;
    await this.save();
  }

  async incrementVideos(count: number = 1): Promise<void> {
    this.total_videos += count;
    await this.save();
  }

  async updateStorageUsed(mb: number): Promise<void> {
    this.storage_used_mb = mb;
    await this.save();
  }

  async incrementAICredits(credits: number): Promise<void> {
    this.ai_credits_used += credits;
    await this.save();
  }

  async updateLastActivity(): Promise<void> {
    this.last_activity = new Date();
    await this.save();
  }

  // Calculate usage percentage based on tenant limits
  async getUsagePercentages(tenant: any): Promise<any> {
    const settings = tenant.settings || {};
    
    return {
      users: settings.maxUsers ? (this.total_users / settings.maxUsers) * 100 : 0,
      storage: settings.maxStorage ? (this.storage_used_mb / settings.maxStorage) * 100 : 0,
      aiCredits: settings.aiCreditsMonthly ? (this.ai_credits_used / settings.aiCreditsMonthly) * 100 : 0
    };
  }
}

export default TenantStats;