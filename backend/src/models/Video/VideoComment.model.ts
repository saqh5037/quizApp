import { DataTypes, Model, Sequelize } from 'sequelize';

export class VideoComment extends Model {
  static initModel(sequelize: Sequelize): typeof VideoComment {
    VideoComment.init(
      { id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true } },
      { sequelize, modelName: 'VideoComment', tableName: 'VideoComments', timestamps: true, underscored: true }
    );
    return VideoComment;
  }
  static associate(models: any) {}
}

export default VideoComment;
