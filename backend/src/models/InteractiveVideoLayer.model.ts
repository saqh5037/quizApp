import {
  Model,
  DataTypes,
  Sequelize,
  Optional,
  BelongsToGetAssociationMixin,
  HasManyGetAssociationsMixin,
  HasManyCreateAssociationMixin
} from 'sequelize';

interface InteractiveVideoLayerAttributes {
  id: number;
  videoId: number;
  isEnabled: boolean;
  aiGeneratedContent: any; // JSONB content
  aiModelUsed?: string;
  confidenceScore?: number;
  autoPause: boolean;
  requireAnswers: boolean;
  passingScore: number;
  maxAttempts: number;
  processingStatus: 'pending' | 'processing' | 'ready' | 'error';
  processingLog?: string;
  createdBy?: number;
  tenantId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface InteractiveVideoLayerCreationAttributes
  extends Optional<
    InteractiveVideoLayerAttributes,
    | 'id'
    | 'isEnabled'
    | 'aiGeneratedContent'
    | 'aiModelUsed'
    | 'confidenceScore'
    | 'autoPause'
    | 'requireAnswers'
    | 'passingScore'
    | 'maxAttempts'
    | 'processingStatus'
    | 'processingLog'
    | 'createdBy'
    | 'tenantId'
    | 'createdAt'
    | 'updatedAt'
  > {}

class InteractiveVideoLayer
  extends Model<InteractiveVideoLayerAttributes, InteractiveVideoLayerCreationAttributes>
  implements InteractiveVideoLayerAttributes {
  declare id: number;
  declare videoId: number;
  declare isEnabled: boolean;
  declare aiGeneratedContent: any;
  declare aiModelUsed?: string;
  declare confidenceScore?: number;
  declare autoPause: boolean;
  declare requireAnswers: boolean;
  declare passingScore: number;
  declare maxAttempts: number;
  declare processingStatus: 'pending' | 'processing' | 'ready' | 'error';
  declare processingLog?: string;
  declare createdBy?: number;
  declare tenantId?: number;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  // Associations
  declare getVideo: BelongsToGetAssociationMixin<any>;
  declare getResults: HasManyGetAssociationsMixin<any>;
  declare createResult: HasManyCreateAssociationMixin<any>;

  static initModel(sequelize: Sequelize): typeof InteractiveVideoLayer {
    InteractiveVideoLayer.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        videoId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'video_id',
          references: {
            model: 'videos',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        isEnabled: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          field: 'is_enabled'
        },
        aiGeneratedContent: {
          type: DataTypes.JSONB,
          allowNull: false,
          field: 'ai_generated_content',
          defaultValue: {}
        },
        aiModelUsed: {
          type: DataTypes.STRING(50),
          allowNull: true,
          field: 'ai_model_used'
        },
        confidenceScore: {
          type: DataTypes.DECIMAL(3, 2),
          allowNull: true,
          field: 'confidence_score'
        },
        autoPause: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          field: 'auto_pause'
        },
        requireAnswers: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          field: 'require_answers'
        },
        passingScore: {
          type: DataTypes.DECIMAL(5, 2),
          defaultValue: 70.00,
          field: 'passing_score'
        },
        maxAttempts: {
          type: DataTypes.INTEGER,
          defaultValue: 3,
          field: 'max_attempts'
        },
        processingStatus: {
          type: DataTypes.ENUM('pending', 'processing', 'ready', 'error'),
          defaultValue: 'pending',
          field: 'processing_status'
        },
        processingLog: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'processing_log'
        },
        createdBy: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'created_by',
          references: {
            model: 'users',
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
        modelName: 'InteractiveVideoLayer',
        tableName: 'interactive_video_layers',
        timestamps: true,
        underscored: true,
        indexes: [
          { fields: ['video_id'] },
          { fields: ['processing_status'] },
          { fields: ['tenant_id'] }
        ]
      }
    );

    return InteractiveVideoLayer;
  }

  static associate(models: any) {
    InteractiveVideoLayer.belongsTo(models.Video, {
      foreignKey: 'videoId',
      as: 'video'
    });

    InteractiveVideoLayer.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });

    InteractiveVideoLayer.hasMany(models.InteractiveVideoResult, {
      foreignKey: 'interactiveLayerId',
      as: 'results'
    });

    if (models.Tenant) {
      InteractiveVideoLayer.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });
    }
  }
}

export default InteractiveVideoLayer;