import { DataTypes, Model, Sequelize } from 'sequelize';

export class VideoQuality extends Model {
  declare id: number;
  declare videoId: number;
  declare quality: string;
  declare width: number;
  declare height: number;
  declare bitrate: number;
  declare fileSizeBytes: number;
  declare filePath: string;

  static initModel(sequelize: Sequelize): typeof VideoQuality {
    VideoQuality.init(
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
        quality: {
          type: DataTypes.STRING(20),
          allowNull: false
        },
        width: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        height: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        bitrate: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        fileSizeBytes: {
          type: DataTypes.BIGINT,
          allowNull: false,
          field: 'file_size_bytes'
        },
        filePath: {
          type: DataTypes.STRING(500),
          allowNull: false,
          field: 'file_path'
        }
      },
      {
        sequelize,
        modelName: 'VideoQuality',
        tableName: 'video_qualities',
        timestamps: true,
        underscored: true
      }
    );

    return VideoQuality;
  }

  static associate(models: any) {
    VideoQuality.belongsTo(models.Video, {
      foreignKey: 'videoId',
      as: 'video'
    });
  }
}

export default VideoQuality;