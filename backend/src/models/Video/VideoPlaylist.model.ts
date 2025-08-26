import { DataTypes, Model, Sequelize } from 'sequelize';

export class VideoPlaylist extends Model {
  static initModel(sequelize: Sequelize): typeof VideoPlaylist {
    VideoPlaylist.init(
      { id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true } },
      { sequelize, modelName: 'VideoPlaylist', tableName: 'VideoPlaylists', timestamps: true, underscored: true }
    );
    return VideoPlaylist;
  }
  static associate(models: any) {}
}

export default VideoPlaylist;
