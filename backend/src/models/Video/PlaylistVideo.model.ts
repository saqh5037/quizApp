import { DataTypes, Model, Sequelize } from 'sequelize';

export class PlaylistVideo extends Model {
  static initModel(sequelize: Sequelize): typeof PlaylistVideo {
    PlaylistVideo.init(
      { id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true } },
      { sequelize, modelName: 'PlaylistVideo', tableName: 'PlaylistVideos', timestamps: true, underscored: true }
    );
    return PlaylistVideo;
  }
  static associate(models: any) {}
}

export default PlaylistVideo;
