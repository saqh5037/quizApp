import { DataTypes, Model, Sequelize } from 'sequelize';

export class VideoProgress extends Model {
  static initModel(sequelize: Sequelize): typeof VideoProgress {
    VideoProgress.init(
      { id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true } },
      { sequelize, modelName: 'VideoProgress', tableName: 'VideoProgresss', timestamps: true, underscored: true }
    );
    return VideoProgress;
  }
  static associate(models: any) {}
}

export default VideoProgress;
