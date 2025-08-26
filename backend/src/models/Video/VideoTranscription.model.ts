import { DataTypes, Model, Sequelize } from 'sequelize';

export class VideoTranscription extends Model {
  static initModel(sequelize: Sequelize): typeof VideoTranscription {
    VideoTranscription.init(
      { id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true } },
      { sequelize, modelName: 'VideoTranscription', tableName: 'VideoTranscriptions', timestamps: true, underscored: true }
    );
    return VideoTranscription;
  }
  static associate(models: any) {}
}

export default VideoTranscription;
