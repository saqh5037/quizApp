import {
  Model,
  DataTypes,
  Sequelize,
  Optional,
  Association,
  HasManyGetAssociationsMixin,
  HasManyAddAssociationMixin,
  HasManyCreateAssociationMixin,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin
} from 'sequelize';
import User from './User.model';
import Quiz from './Quiz.model';

interface VideoAttributes {
  id: number;
  uuid: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  fileSizeBytes?: number;
  originalPath?: string;
  processedPath?: string;
  hlsPlaylistUrl?: string;
  creatorId?: number;
  organizationId?: number;
  categoryId?: number;
  tags?: string[];
  language?: string;
  status?: string;
  processingProgress?: number;
  errorMessage?: string;
  isPublic?: boolean;
  allowDownload?: boolean;
  requiresAuth?: boolean;
  linkedQuizId?: number;
  viewCount?: number;
  likeCount?: number;
  averageWatchTime?: number;
  completionRate?: number;
  slug?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  publishedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface VideoCreationAttributes
  extends Optional<
    VideoAttributes,
    | 'id'
    | 'uuid'
    | 'description'
    | 'thumbnailUrl'
    | 'durationSeconds'
    | 'fileSizeBytes'
    | 'originalPath'
    | 'processedPath'
    | 'hlsPlaylistUrl'
    | 'creatorId'
    | 'organizationId'
    | 'categoryId'
    | 'tags'
    | 'language'
    | 'status'
    | 'processingProgress'
    | 'errorMessage'
    | 'isPublic'
    | 'allowDownload'
    | 'requiresAuth'
    | 'linkedQuizId'
    | 'viewCount'
    | 'likeCount'
    | 'averageWatchTime'
    | 'completionRate'
    | 'slug'
    | 'metaDescription'
    | 'metaKeywords'
    | 'publishedAt'
    | 'createdAt'
    | 'updatedAt'
    | 'deletedAt'
  > {}

export class Video
  extends Model<VideoAttributes, VideoCreationAttributes>
  implements VideoAttributes
{
  public id!: number;
  public uuid!: string;
  public title!: string;
  public description?: string;
  public thumbnailUrl?: string;
  public durationSeconds?: number;
  public fileSizeBytes?: number;
  public originalPath?: string;
  public processedPath?: string;
  public hlsPlaylistUrl?: string;
  public creatorId?: number;
  public organizationId?: number;
  public categoryId?: number;
  public tags?: string[];
  public language?: string;
  public status?: string;
  public processingProgress?: number;
  public errorMessage?: string;
  public isPublic?: boolean;
  public allowDownload?: boolean;
  public requiresAuth?: boolean;
  public linkedQuizId?: number;
  public viewCount?: number;
  public likeCount?: number;
  public averageWatchTime?: number;
  public completionRate?: number;
  public slug?: string;
  public metaDescription?: string;
  public metaKeywords?: string[];
  public publishedAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;

  // Associations
  public readonly creator?: User;
  public readonly linkedQuiz?: Quiz;
  public readonly qualities?: VideoQuality[];
  public readonly chapters?: VideoChapter[];
  public readonly transcriptions?: VideoTranscription[];
  public readonly progress?: VideoProgress[];
  public readonly notes?: VideoNote[];
  public readonly bookmarks?: VideoBookmark[];
  public readonly comments?: VideoComment[];
  public readonly analytics?: VideoAnalytics[];

  public static associations: {
    creator: Association<Video, User>;
    linkedQuiz: Association<Video, Quiz>;
    qualities: Association<Video, VideoQuality>;
    chapters: Association<Video, VideoChapter>;
    transcriptions: Association<Video, VideoTranscription>;
    progress: Association<Video, VideoProgress>;
    notes: Association<Video, VideoNote>;
    bookmarks: Association<Video, VideoBookmark>;
    comments: Association<Video, VideoComment>;
    analytics: Association<Video, VideoAnalytics>;
  };

  public static initModel(sequelize: Sequelize): typeof Video {
    Video.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
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
          type: DataTypes.TEXT
        },
        thumbnailUrl: {
          type: DataTypes.TEXT,
          field: 'thumbnail_url'
        },
        durationSeconds: {
          type: DataTypes.INTEGER,
          field: 'duration_seconds'
        },
        fileSizeBytes: {
          type: DataTypes.BIGINT,
          field: 'file_size_bytes'
        },
        originalPath: {
          type: DataTypes.STRING(500),
          field: 'original_path'
        },
        processedPath: {
          type: DataTypes.STRING(500),
          field: 'processed_path'
        },
        hlsPlaylistUrl: {
          type: DataTypes.TEXT,
          field: 'hls_playlist_url'
        },
        creatorId: {
          type: DataTypes.INTEGER,
          field: 'creator_id',
          references: {
            model: 'users',
            key: 'id'
          }
        },
        organizationId: {
          type: DataTypes.INTEGER,
          field: 'organization_id',
          references: {
            model: 'organizations',
            key: 'id'
          }
        },
        categoryId: {
          type: DataTypes.INTEGER,
          field: 'category_id',
          references: {
            model: 'video_categories',
            key: 'id'
          }
        },
        tags: {
          type: DataTypes.ARRAY(DataTypes.TEXT)
        },
        language: {
          type: DataTypes.STRING(10),
          defaultValue: 'es'
        },
        status: {
          type: DataTypes.STRING(50),
          defaultValue: 'draft'
        },
        processingProgress: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          field: 'processing_progress'
        },
        errorMessage: {
          type: DataTypes.TEXT,
          field: 'error_message'
        },
        isPublic: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          field: 'is_public'
        },
        allowDownload: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          field: 'allow_download'
        },
        requiresAuth: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          field: 'requires_auth'
        },
        linkedQuizId: {
          type: DataTypes.INTEGER,
          field: 'linked_quiz_id',
          references: {
            model: 'quizzes',
            key: 'id'
          }
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
          type: DataTypes.INTEGER,
          defaultValue: 0,
          field: 'average_watch_time'
        },
        completionRate: {
          type: DataTypes.DECIMAL(5, 2),
          field: 'completion_rate'
        },
        slug: {
          type: DataTypes.STRING(255),
          unique: true
        },
        metaDescription: {
          type: DataTypes.TEXT,
          field: 'meta_description'
        },
        metaKeywords: {
          type: DataTypes.ARRAY(DataTypes.TEXT),
          field: 'meta_keywords'
        },
        publishedAt: {
          type: DataTypes.DATE,
          field: 'published_at'
        },
        deletedAt: {
          type: DataTypes.DATE,
          field: 'deleted_at'
        }
      },
      {
        sequelize,
        modelName: 'Video',
        tableName: 'videos',
        timestamps: true,
        paranoid: false, // Disable soft deletes for PostgreSQL compatibility
        underscored: true,
        indexes: [
          { fields: ['status'] },
          { fields: ['creator_id'] },
          { fields: ['category_id'] },
          { fields: ['slug'] },
          { fields: ['organization_id'] }
        ]
      }
    );

    return Video;
  }

  public static associate(models: any): void {
    Video.belongsTo(models.User, {
      foreignKey: 'creatorId',
      as: 'creator'
    });

    Video.belongsTo(models.Quiz, {
      foreignKey: 'linkedQuizId',
      as: 'linkedQuiz'
    });

    Video.belongsTo(models.VideoCategory, {
      foreignKey: 'categoryId',
      as: 'category'
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

    Video.hasMany(models.VideoAnalytics, {
      foreignKey: 'videoId',
      as: 'analytics'
    });

    Video.hasMany(models.VideoQuizPoint, {
      foreignKey: 'videoId',
      as: 'quizPoints'
    });

    Video.belongsToMany(models.VideoPlaylist, {
      through: models.PlaylistVideo,
      foreignKey: 'videoId',
      as: 'playlists'
    });
  }
}

// Additional model classes (simplified versions)
export class VideoQuality extends Model {
  public id!: number;
  public videoId!: number;
  public quality!: string;
  public width!: number;
  public height!: number;
  public bitrate!: number;
  public fileSizeBytes!: number;
  public filePath!: string;

  public static initModel(sequelize: Sequelize): typeof VideoQuality {
    VideoQuality.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        videoId: {
          type: DataTypes.INTEGER,
          field: 'video_id',
          references: {
            model: 'videos',
            key: 'id'
          }
        },
        quality: {
          type: DataTypes.STRING(20)
        },
        width: {
          type: DataTypes.INTEGER
        },
        height: {
          type: DataTypes.INTEGER
        },
        bitrate: {
          type: DataTypes.INTEGER
        },
        fileSizeBytes: {
          type: DataTypes.BIGINT,
          field: 'file_size_bytes'
        },
        filePath: {
          type: DataTypes.TEXT,
          field: 'file_path'
        }
      },
      {
        sequelize,
        modelName: 'VideoQuality',
        tableName: 'video_qualities',
        timestamps: false,
        underscored: true
      }
    );
    return VideoQuality;
  }
}

export class VideoChapter extends Model {
  public id!: number;
  public videoId!: number;
  public title!: string;
  public description?: string;
  public startTimeSeconds!: number;
  public endTimeSeconds?: number;
  public thumbnailUrl?: string;
  public orderPosition?: number;

  public static initModel(sequelize: Sequelize): typeof VideoChapter {
    VideoChapter.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        videoId: {
          type: DataTypes.INTEGER,
          field: 'video_id',
          references: {
            model: 'videos',
            key: 'id'
          }
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        description: {
          type: DataTypes.TEXT
        },
        startTimeSeconds: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'start_time_seconds'
        },
        endTimeSeconds: {
          type: DataTypes.INTEGER,
          field: 'end_time_seconds'
        },
        thumbnailUrl: {
          type: DataTypes.TEXT,
          field: 'thumbnail_url'
        },
        orderPosition: {
          type: DataTypes.INTEGER,
          field: 'order_position'
        }
      },
      {
        sequelize,
        modelName: 'VideoChapter',
        tableName: 'video_chapters',
        timestamps: true,
        underscored: true
      }
    );
    return VideoChapter;
  }
}

export class VideoTranscription extends Model {
  public id!: number;
  public videoId!: number;
  public language!: string;
  public type?: string;
  public vttFilePath?: string;
  public srtFilePath?: string;
  public fullText?: string;
  public isDefault!: boolean;

  public static initModel(sequelize: Sequelize): typeof VideoTranscription {
    VideoTranscription.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        videoId: {
          type: DataTypes.INTEGER,
          field: 'video_id',
          references: {
            model: 'videos',
            key: 'id'
          }
        },
        language: {
          type: DataTypes.STRING(10),
          defaultValue: 'es'
        },
        type: {
          type: DataTypes.STRING(50)
        },
        vttFilePath: {
          type: DataTypes.TEXT,
          field: 'vtt_file_path'
        },
        srtFilePath: {
          type: DataTypes.TEXT,
          field: 'srt_file_path'
        },
        fullText: {
          type: DataTypes.TEXT,
          field: 'full_text'
        },
        isDefault: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          field: 'is_default'
        }
      },
      {
        sequelize,
        modelName: 'VideoTranscription',
        tableName: 'video_transcriptions',
        timestamps: false,
        underscored: true
      }
    );
    return VideoTranscription;
  }
}

export class VideoProgress extends Model {
  public id!: number;
  public userId!: number;
  public videoId!: number;
  public sessionId?: string;
  public watchedSeconds!: number;
  public totalWatchTime!: number;
  public lastPositionSeconds!: number;
  public completed!: boolean;
  public completionPercentage!: number;
  public startedAt!: Date;
  public lastWatchedAt!: Date;
  public completedAt?: Date;

  public static initModel(sequelize: Sequelize): typeof VideoProgress {
    VideoProgress.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        userId: {
          type: DataTypes.INTEGER,
          field: 'user_id',
          references: {
            model: 'users',
            key: 'id'
          }
        },
        videoId: {
          type: DataTypes.INTEGER,
          field: 'video_id',
          references: {
            model: 'videos',
            key: 'id'
          }
        },
        sessionId: {
          type: DataTypes.STRING(255),
          field: 'session_id'
        },
        watchedSeconds: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          field: 'watched_seconds'
        },
        totalWatchTime: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          field: 'total_watch_time'
        },
        lastPositionSeconds: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          field: 'last_position_seconds'
        },
        completed: {
          type: DataTypes.BOOLEAN,
          defaultValue: false
        },
        completionPercentage: {
          type: DataTypes.DECIMAL(5, 2),
          defaultValue: 0,
          field: 'completion_percentage'
        },
        startedAt: {
          type: DataTypes.DATE,
          field: 'started_at'
        },
        lastWatchedAt: {
          type: DataTypes.DATE,
          field: 'last_watched_at'
        },
        completedAt: {
          type: DataTypes.DATE,
          field: 'completed_at'
        }
      },
      {
        sequelize,
        modelName: 'VideoProgress',
        tableName: 'video_progress',
        timestamps: false,
        underscored: true,
        indexes: [
          { fields: ['user_id'] },
          { fields: ['video_id'] },
          { unique: true, fields: ['user_id', 'video_id'] }
        ]
      }
    );
    return VideoProgress;
  }
}

export class VideoNote extends Model {
  public id!: number;
  public userId!: number;
  public videoId!: number;
  public timestampSeconds!: number;
  public noteText!: string;
  public isPublic!: boolean;

  public static initModel(sequelize: Sequelize): typeof VideoNote {
    VideoNote.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        userId: {
          type: DataTypes.INTEGER,
          field: 'user_id',
          references: {
            model: 'users',
            key: 'id'
          }
        },
        videoId: {
          type: DataTypes.INTEGER,
          field: 'video_id',
          references: {
            model: 'videos',
            key: 'id'
          }
        },
        timestampSeconds: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'timestamp_seconds'
        },
        noteText: {
          type: DataTypes.TEXT,
          allowNull: false,
          field: 'note_text'
        },
        isPublic: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          field: 'is_public'
        }
      },
      {
        sequelize,
        modelName: 'VideoNote',
        tableName: 'video_notes',
        timestamps: true,
        underscored: true,
        indexes: [
          { fields: ['video_id', 'user_id'] }
        ]
      }
    );
    return VideoNote;
  }
}

export class VideoBookmark extends Model {
  public id!: number;
  public userId!: number;
  public videoId!: number;
  public timestampSeconds!: number;
  public title?: string;
  public color!: string;

  public static initModel(sequelize: Sequelize): typeof VideoBookmark {
    VideoBookmark.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        userId: {
          type: DataTypes.INTEGER,
          field: 'user_id',
          references: {
            model: 'users',
            key: 'id'
          }
        },
        videoId: {
          type: DataTypes.INTEGER,
          field: 'video_id',
          references: {
            model: 'videos',
            key: 'id'
          }
        },
        timestampSeconds: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'timestamp_seconds'
        },
        title: {
          type: DataTypes.STRING(255)
        },
        color: {
          type: DataTypes.STRING(7),
          defaultValue: '#3B82F6'
        }
      },
      {
        sequelize,
        modelName: 'VideoBookmark',
        tableName: 'video_bookmarks',
        timestamps: false,
        underscored: true,
        indexes: [
          { unique: true, fields: ['user_id', 'video_id', 'timestamp_seconds'] }
        ]
      }
    );
    return VideoBookmark;
  }
}

export class VideoComment extends Model {
  public id!: number;
  public videoId!: number;
  public userId!: number;
  public parentId?: number;
  public commentText!: string;
  public timestampSeconds?: number;
  public likesCount!: number;
  public isPinned!: boolean;

  public static initModel(sequelize: Sequelize): typeof VideoComment {
    VideoComment.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        videoId: {
          type: DataTypes.INTEGER,
          field: 'video_id',
          references: {
            model: 'videos',
            key: 'id'
          }
        },
        userId: {
          type: DataTypes.INTEGER,
          field: 'user_id',
          references: {
            model: 'users',
            key: 'id'
          }
        },
        parentId: {
          type: DataTypes.INTEGER,
          field: 'parent_id',
          references: {
            model: 'video_comments',
            key: 'id'
          }
        },
        commentText: {
          type: DataTypes.TEXT,
          allowNull: false,
          field: 'comment_text'
        },
        timestampSeconds: {
          type: DataTypes.INTEGER,
          field: 'timestamp_seconds'
        },
        likesCount: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          field: 'likes_count'
        },
        isPinned: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          field: 'is_pinned'
        }
      },
      {
        sequelize,
        modelName: 'VideoComment',
        tableName: 'video_comments',
        timestamps: true,
        underscored: true
      }
    );
    return VideoComment;
  }
}

export class VideoAnalytics extends Model {
  public id!: number;
  public videoId!: number;
  public userId?: number;
  public sessionId?: string;
  public eventType!: string;
  public timestampSeconds?: number;
  public additionalData?: any;
  public ipAddress?: string;
  public userAgent?: string;

  public static initModel(sequelize: Sequelize): typeof VideoAnalytics {
    VideoAnalytics.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        videoId: {
          type: DataTypes.INTEGER,
          field: 'video_id',
          references: {
            model: 'videos',
            key: 'id'
          }
        },
        userId: {
          type: DataTypes.INTEGER,
          field: 'user_id',
          references: {
            model: 'users',
            key: 'id'
          }
        },
        sessionId: {
          type: DataTypes.STRING(255),
          field: 'session_id'
        },
        eventType: {
          type: DataTypes.STRING(50),
          field: 'event_type'
        },
        timestampSeconds: {
          type: DataTypes.INTEGER,
          field: 'timestamp_seconds'
        },
        additionalData: {
          type: DataTypes.JSON,
          field: 'additional_data'
        },
        ipAddress: {
          type: DataTypes.STRING,
          field: 'ip_address'
        },
        userAgent: {
          type: DataTypes.TEXT,
          field: 'user_agent'
        }
      },
      {
        sequelize,
        modelName: 'VideoAnalytics',
        tableName: 'video_analytics',
        timestamps: false,
        underscored: true,
        indexes: [
          { fields: ['video_id'] },
          { fields: ['session_id'] },
          { fields: ['created_at'] }
        ]
      }
    );
    return VideoAnalytics;
  }
}

export class VideoCategory extends Model {
  public id!: number;
  public name!: string;
  public slug?: string;
  public description?: string;
  public icon?: string;
  public parentId?: number;
  public orderPosition!: number;

  public static initModel(sequelize: Sequelize): typeof VideoCategory {
    VideoCategory.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false
        },
        slug: {
          type: DataTypes.STRING(100),
          unique: true
        },
        description: {
          type: DataTypes.TEXT
        },
        icon: {
          type: DataTypes.STRING(50)
        },
        parentId: {
          type: DataTypes.INTEGER,
          field: 'parent_id',
          references: {
            model: 'video_categories',
            key: 'id'
          }
        },
        orderPosition: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          field: 'order_position'
        }
      },
      {
        sequelize,
        modelName: 'VideoCategory',
        tableName: 'video_categories',
        timestamps: true,
        paranoid: false, // Disable soft deletes
        underscored: true
      }
    );
    return VideoCategory;
  }
}

export class VideoQuizPoint extends Model {
  public id!: number;
  public videoId!: number;
  public quizId?: number;
  public questionId?: number;
  public triggerTimeSeconds!: number;
  public pauseVideo!: boolean;
  public mandatory!: boolean;

  public static initModel(sequelize: Sequelize): typeof VideoQuizPoint {
    VideoQuizPoint.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        videoId: {
          type: DataTypes.INTEGER,
          field: 'video_id',
          references: {
            model: 'videos',
            key: 'id'
          }
        },
        quizId: {
          type: DataTypes.INTEGER,
          field: 'quiz_id',
          references: {
            model: 'quizzes',
            key: 'id'
          }
        },
        questionId: {
          type: DataTypes.INTEGER,
          field: 'question_id',
          references: {
            model: 'questions',
            key: 'id'
          }
        },
        triggerTimeSeconds: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'trigger_time_seconds'
        },
        pauseVideo: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          field: 'pause_video'
        },
        mandatory: {
          type: DataTypes.BOOLEAN,
          defaultValue: false
        }
      },
      {
        sequelize,
        modelName: 'VideoQuizPoint',
        tableName: 'video_quiz_points',
        timestamps: false,
        underscored: true
      }
    );
    return VideoQuizPoint;
  }
}

export class VideoPlaylist extends Model {
  public id!: number;
  public title!: string;
  public description?: string;
  public thumbnailUrl?: string;
  public creatorId?: number;
  public organizationId?: number;
  public isCourse!: boolean;
  public isPublic!: boolean;
  public totalDurationSeconds?: number;
  public videoCount!: number;
  public enrolledCount!: number;

  public static initModel(sequelize: Sequelize): typeof VideoPlaylist {
    VideoPlaylist.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        description: {
          type: DataTypes.TEXT
        },
        thumbnailUrl: {
          type: DataTypes.TEXT,
          field: 'thumbnail_url'
        },
        creatorId: {
          type: DataTypes.INTEGER,
          field: 'creator_id',
          references: {
            model: 'users',
            key: 'id'
          }
        },
        organizationId: {
          type: DataTypes.INTEGER,
          field: 'organization_id',
          references: {
            model: 'organizations',
            key: 'id'
          }
        },
        isCourse: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          field: 'is_course'
        },
        isPublic: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          field: 'is_public'
        },
        totalDurationSeconds: {
          type: DataTypes.INTEGER,
          field: 'total_duration_seconds'
        },
        videoCount: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          field: 'video_count'
        },
        enrolledCount: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          field: 'enrolled_count'
        }
      },
      {
        sequelize,
        modelName: 'VideoPlaylist',
        tableName: 'video_playlists',
        timestamps: true,
        underscored: true
      }
    );
    return VideoPlaylist;
  }
}

export class PlaylistVideo extends Model {
  public id!: number;
  public playlistId!: number;
  public videoId!: number;
  public orderPosition!: number;
  public isRequired!: boolean;

  public static initModel(sequelize: Sequelize): typeof PlaylistVideo {
    PlaylistVideo.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        playlistId: {
          type: DataTypes.INTEGER,
          field: 'playlist_id',
          references: {
            model: 'video_playlists',
            key: 'id'
          }
        },
        videoId: {
          type: DataTypes.INTEGER,
          field: 'video_id',
          references: {
            model: 'videos',
            key: 'id'
          }
        },
        orderPosition: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'order_position'
        },
        isRequired: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          field: 'is_required'
        }
      },
      {
        sequelize,
        modelName: 'PlaylistVideo',
        tableName: 'playlist_videos',
        timestamps: false,
        underscored: true,
        indexes: [
          { unique: true, fields: ['playlist_id', 'video_id'] }
        ]
      }
    );
    return PlaylistVideo;
  }
}