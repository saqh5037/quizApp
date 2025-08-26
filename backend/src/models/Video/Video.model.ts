import { DataTypes, Model, Sequelize } from 'sequelize';
import {
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  HasManyGetAssociationsMixin,
  HasManyCreateAssociationMixin,
  HasManyCountAssociationsMixin
} from 'sequelize';

export class Video extends Model {
  declare id: number;
  declare uuid: string;
  declare title: string;
  declare description?: string;
  declare thumbnailUrl?: string;
  declare durationSeconds?: number;
  declare fileSizeBytes?: number;
  declare originalPath?: string;
  declare processedPath?: string;
  declare hlsPlaylistUrl?: string;
  declare streamUrl?: string;
  declare filePath?: string; // Path to the actual video file
  declare storageProvider?: 'local' | 'minio' | 's3';
  
  declare creatorId?: number;
  declare organizationId?: number;
  declare categoryId?: number;
  declare tenantId?: number;
  
  declare tags?: string[];
  declare language?: string;
  declare status: 'pending' | 'processing' | 'ready' | 'error';
  declare processingProgress?: number;
  declare errorMessage?: string;
  
  declare isPublic: boolean;
  declare allowDownload: boolean;
  declare requiresAuth: boolean;
  declare linkedQuizId?: number;
  
  declare viewCount: number;
  declare likeCount: number;
  declare averageWatchTime?: number;
  declare completionRate?: number;
  
  declare slug?: string;
  declare metaDescription?: string;
  declare metaKeywords?: string[];
  
  declare publishedAt?: Date;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;
  declare deletedAt?: Date;

  // Associations
  declare getCreator: BelongsToGetAssociationMixin<any>;
  declare getCategory: BelongsToGetAssociationMixin<any>;
  declare getQualities: HasManyGetAssociationsMixin<any>;
  declare getChapters: HasManyGetAssociationsMixin<any>;
  declare getTranscriptions: HasManyGetAssociationsMixin<any>;
  declare getInteractiveLayers: HasManyGetAssociationsMixin<any>;
  
  static initModel(sequelize: Sequelize): typeof Video {
    Video.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        uuid: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          unique: true,
          allowNull: false
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        thumbnailUrl: {
          type: DataTypes.STRING(500),
          allowNull: true,
          field: 'thumbnail_url'
        },
        durationSeconds: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'duration_seconds'
        },
        fileSizeBytes: {
          type: DataTypes.BIGINT,
          allowNull: true,
          field: 'file_size_bytes'
        },
        originalPath: {
          type: DataTypes.STRING(500),
          allowNull: true,
          field: 'original_path'
        },
        processedPath: {
          type: DataTypes.STRING(500),
          allowNull: true,
          field: 'processed_path'
        },
        hlsPlaylistUrl: {
          type: DataTypes.STRING(500),
          allowNull: true,
          field: 'hls_playlist_url'
        },
        streamUrl: {
          type: DataTypes.STRING(500),
          allowNull: true,
          field: 'stream_url'
        },
        filePath: {
          type: DataTypes.STRING(500),
          allowNull: true,
          field: 'file_path'
        },
        storageProvider: {
          type: DataTypes.ENUM('local', 'minio', 's3'),
          defaultValue: 'minio',
          field: 'storage_provider'
        },
        creatorId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'creator_id',
          references: {
            model: 'users',
            key: 'id'
          }
        },
        organizationId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'organization_id'
        },
        categoryId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'category_id'
        },
        tenantId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'tenant_id',
          references: {
            model: 'tenants',
            key: 'id'
          }
        },
        tags: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          defaultValue: [],
          allowNull: false
        },
        language: {
          type: DataTypes.STRING(10),
          defaultValue: 'es',
          allowNull: false
        },
        status: {
          type: DataTypes.ENUM('pending', 'processing', 'ready', 'error'),
          defaultValue: 'pending',
          allowNull: false
        },
        processingProgress: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          field: 'processing_progress'
        },
        errorMessage: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'error_message'
        },
        isPublic: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          field: 'is_public'
        },
        allowDownload: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          field: 'allow_download'
        },
        requiresAuth: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          field: 'requires_auth'
        },
        linkedQuizId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'linked_quiz_id'
        },
        viewCount: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          field: 'view_count'
        },
        likeCount: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          field: 'like_count'
        },
        averageWatchTime: {
          type: DataTypes.FLOAT,
          allowNull: true,
          field: 'average_watch_time'
        },
        completionRate: {
          type: DataTypes.FLOAT,
          allowNull: true,
          field: 'completion_rate'
        },
        slug: {
          type: DataTypes.STRING(255),
          unique: true,
          allowNull: true
        },
        metaDescription: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'meta_description'
        },
        metaKeywords: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          defaultValue: [],
          field: 'meta_keywords'
        },
        publishedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'published_at'
        },
        deletedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'deleted_at'
        }
      },
      {
        sequelize,
        modelName: 'Video',
        tableName: 'videos',
        timestamps: true,
        underscored: true,
        paranoid: true,
        indexes: [
          { fields: ['uuid'] },
          { fields: ['status'] },
          { fields: ['creator_id'] },
          { fields: ['category_id'] },
          { fields: ['tenant_id'] },
          { fields: ['is_public'] },
          { fields: ['slug'] },
          { fields: ['published_at'] }
        ]
      }
    );

    return Video;
  }

  static associate(models: any) {
    Video.belongsTo(models.User, {
      foreignKey: 'creatorId',
      as: 'creator'
    });

    Video.belongsTo(models.VideoCategory, {
      foreignKey: 'categoryId',
      as: 'category'
    });

    Video.belongsTo(models.Quiz, {
      foreignKey: 'linkedQuizId',
      as: 'linkedQuiz'
    });

    Video.hasMany(models.VideoQuality, {
      foreignKey: 'videoId',
      as: 'qualities'
    });

    Video.hasMany(models.VideoChapter, {
      foreignKey: 'videoId',
      as: 'chapters'
    });

    Video.hasMany(models.VideoTranscription, {
      foreignKey: 'videoId',
      as: 'transcriptions'
    });

    Video.hasMany(models.VideoProgress, {
      foreignKey: 'videoId',
      as: 'progress'
    });

    Video.hasMany(models.VideoNote, {
      foreignKey: 'videoId',
      as: 'notes'
    });

    Video.hasMany(models.VideoBookmark, {
      foreignKey: 'videoId',
      as: 'bookmarks'
    });

    Video.hasMany(models.VideoComment, {
      foreignKey: 'videoId',
      as: 'comments'
    });

    Video.hasOne(models.VideoAnalytics, {
      foreignKey: 'videoId',
      as: 'analytics'
    });

    Video.hasMany(models.VideoQuizPoint, {
      foreignKey: 'videoId',
      as: 'quizPoints'
    });

    Video.hasMany(models.InteractiveVideoLayer, {
      foreignKey: 'videoId',
      as: 'interactiveLayers'
    });

    Video.belongsToMany(models.VideoPlaylist, {
      through: models.PlaylistVideo,
      foreignKey: 'videoId',
      as: 'playlists'
    });

    if (models.Tenant) {
      Video.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });
    }
  }
}

export default Video;