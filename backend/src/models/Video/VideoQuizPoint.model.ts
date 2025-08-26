import { DataTypes, Model, Sequelize } from 'sequelize';

export class VideoQuizPoint extends Model {
  static initModel(sequelize: Sequelize): typeof VideoQuizPoint {
    VideoQuizPoint.init(
      { id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true } },
      { sequelize, modelName: 'VideoQuizPoint', tableName: 'VideoQuizPoints', timestamps: true, underscored: true }
    );
    return VideoQuizPoint;
  }
  static associate(models: any) {}
}

export default VideoQuizPoint;
