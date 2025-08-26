import { DataTypes, Model, Sequelize } from 'sequelize';

export class VideoChapter extends Model {
  static initModel(sequelize: Sequelize): typeof VideoChapter {
    VideoChapter.init(
      { id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true } },
      { sequelize, modelName: 'VideoChapter', tableName: 'video_chapters', timestamps: true, underscored: true }
    );
    return VideoChapter;
  }
  static associate(models: any) {}
}

export default VideoChapter;