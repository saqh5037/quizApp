import { DataTypes, Model, Sequelize } from 'sequelize';

export class VideoNote extends Model {
  static initModel(sequelize: Sequelize): typeof VideoNote {
    VideoNote.init(
      { id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true } },
      { sequelize, modelName: 'VideoNote', tableName: 'VideoNotes', timestamps: true, underscored: true }
    );
    return VideoNote;
  }
  static associate(models: any) {}
}

export default VideoNote;
