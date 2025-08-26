import { DataTypes, Model, Sequelize } from 'sequelize';

export class VideoAnalytics extends Model {
  static initModel(sequelize: Sequelize): typeof VideoAnalytics {
    VideoAnalytics.init(
      { id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true } },
      { sequelize, modelName: 'VideoAnalytics', tableName: 'VideoAnalyticss', timestamps: true, underscored: true }
    );
    return VideoAnalytics;
  }
  static associate(models: any) {}
}

export default VideoAnalytics;
