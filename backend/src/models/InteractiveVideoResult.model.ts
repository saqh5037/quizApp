import {
  Model,
  DataTypes,
  Sequelize,
  Optional,
  BelongsToGetAssociationMixin,
  HasManyGetAssociationsMixin,
  HasManyCreateAssociationMixin
} from 'sequelize';

interface InteractiveVideoResultAttributes {
  id: number;
  interactiveLayerId: number;
  userId: number;
  sessionId: string;
  totalQuestions: number;
  correctAnswers: number;
  finalScore?: number;
  completionPercentage?: number;
  watchTimeSeconds?: number;
  totalPauses?: number;
  detailedResponses?: any; // JSONB
  keyMomentsCompleted?: number[];
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt?: Date;
  completedAt?: Date;
  certificateEarned: boolean;
  certificateId?: number;
  tenantId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface InteractiveVideoResultCreationAttributes
  extends Optional<
    InteractiveVideoResultAttributes,
    | 'id'
    | 'totalQuestions'
    | 'correctAnswers'
    | 'finalScore'
    | 'completionPercentage'
    | 'watchTimeSeconds'
    | 'totalPauses'
    | 'detailedResponses'
    | 'keyMomentsCompleted'
    | 'status'
    | 'startedAt'
    | 'completedAt'
    | 'certificateEarned'
    | 'certificateId'
    | 'tenantId'
    | 'createdAt'
    | 'updatedAt'
  > {}

class InteractiveVideoResult
  extends Model<InteractiveVideoResultAttributes, InteractiveVideoResultCreationAttributes>
  implements InteractiveVideoResultAttributes {
  declare id: number;
  declare interactiveLayerId: number;
  declare userId: number;
  declare sessionId: string;
  declare totalQuestions: number;
  declare correctAnswers: number;
  declare finalScore?: number;
  declare completionPercentage?: number;
  declare watchTimeSeconds?: number;
  declare totalPauses?: number;
  declare detailedResponses?: any;
  declare keyMomentsCompleted?: number[];
  declare status: 'in_progress' | 'completed' | 'abandoned';
  declare startedAt?: Date;
  declare completedAt?: Date;
  declare certificateEarned: boolean;
  declare certificateId?: number;
  declare tenantId?: number;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  // Associations
  declare getLayer: BelongsToGetAssociationMixin<any>;
  declare getUser: BelongsToGetAssociationMixin<any>;
  declare getAnswers: HasManyGetAssociationsMixin<any>;
  declare createAnswer: HasManyCreateAssociationMixin<any>;

  static initModel(sequelize: Sequelize): typeof InteractiveVideoResult {
    InteractiveVideoResult.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        interactiveLayerId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'interactive_layer_id',
          references: {
            model: 'interactive_video_layers',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'user_id',
          references: {
            model: 'users',
            key: 'id'
          }
        },
        sessionId: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true,
          field: 'session_id'
        },
        totalQuestions: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          field: 'total_questions'
        },
        correctAnswers: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          field: 'correct_answers'
        },
        finalScore: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          field: 'final_score'
        },
        completionPercentage: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          field: 'completion_percentage'
        },
        watchTimeSeconds: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'watch_time_seconds'
        },
        totalPauses: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          field: 'total_pauses'
        },
        detailedResponses: {
          type: DataTypes.JSONB,
          allowNull: true,
          field: 'detailed_responses',
          defaultValue: []
        },
        keyMomentsCompleted: {
          type: DataTypes.ARRAY(DataTypes.INTEGER),
          allowNull: true,
          field: 'key_moments_completed',
          defaultValue: []
        },
        status: {
          type: DataTypes.ENUM('in_progress', 'completed', 'abandoned'),
          defaultValue: 'in_progress'
        },
        startedAt: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
          field: 'started_at'
        },
        completedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'completed_at'
        },
        certificateEarned: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          field: 'certificate_earned'
        },
        certificateId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'certificate_id',
          references: {
            model: 'certificates',
            key: 'id'
          }
        },
        tenantId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'tenant_id',
          references: {
            model: 'tenants',
            key: 'id'
          }
        }
      },
      {
        sequelize,
        modelName: 'InteractiveVideoResult',
        tableName: 'interactive_video_results',
        timestamps: true,
        underscored: true,
        indexes: [
          { fields: ['interactive_layer_id', 'user_id', 'session_id'], unique: true },
          { fields: ['user_id'] },
          { fields: ['session_id'] },
          { fields: ['status'] },
          { fields: ['tenant_id'] }
        ]
      }
    );

    return InteractiveVideoResult;
  }

  static associate(models: any) {
    InteractiveVideoResult.belongsTo(models.InteractiveVideoLayer, {
      foreignKey: 'interactiveLayerId',
      as: 'layer'
    });

    InteractiveVideoResult.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    InteractiveVideoResult.hasMany(models.InteractiveVideoAnswer, {
      foreignKey: 'resultId',
      as: 'answers'
    });

    if (models.Certificate) {
      InteractiveVideoResult.belongsTo(models.Certificate, {
        foreignKey: 'certificateId',
        as: 'certificate'
      });
    }

    if (models.Tenant) {
      InteractiveVideoResult.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });
    }
  }

  // Helper method to calculate score
  calculateScore(): number {
    if (this.totalQuestions === 0) return 0;
    return (this.correctAnswers / this.totalQuestions) * 100;
  }

  // Helper method to check if passed
  hasPassed(passingScore: number = 70): boolean {
    return this.calculateScore() >= passingScore;
  }
}

export default InteractiveVideoResult;