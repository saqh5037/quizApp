import { DataTypes, Model, Sequelize } from 'sequelize';

export class VideoBookmark extends Model {
  static initModel(sequelize: Sequelize): typeof VideoBookmark {
    VideoBookmark.init(
      { id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true } },
      { sequelize, modelName: 'VideoBookmark', tableName: 'VideoBookmarks', timestamps: true, underscored: true }
    );
    return VideoBookmark;
  }
  static associate(models: any) {}
}

export default VideoBookmark;
