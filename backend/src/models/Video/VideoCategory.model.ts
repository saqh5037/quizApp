import { DataTypes, Model, Sequelize } from 'sequelize';

export class VideoCategory extends Model {
  declare id: number;
  declare name: string;
  declare slug: string;
  declare description?: string;
  declare icon?: string;
  declare parentId?: number;
  declare orderPosition?: number;

  static initModel(sequelize: Sequelize): typeof VideoCategory {
    VideoCategory.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false
        },
        slug: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        icon: {
          type: DataTypes.STRING(50),
          allowNull: true
        },
        parentId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'parent_id',
          references: {
            model: 'video_categories',
            key: 'id'
          }
        },
        orderPosition: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          field: 'order_position'
        }
      },
      {
        sequelize,
        modelName: 'VideoCategory',
        tableName: 'video_categories',
        timestamps: true,
        underscored: true
      }
    );

    return VideoCategory;
  }

  static associate(models: any) {
    VideoCategory.hasMany(models.Video, {
      foreignKey: 'categoryId',
      as: 'videos'
    });

    VideoCategory.hasMany(VideoCategory, {
      foreignKey: 'parentId',
      as: 'subcategories'
    });

    VideoCategory.belongsTo(VideoCategory, {
      foreignKey: 'parentId',
      as: 'parent'
    });
  }
}

export default VideoCategory;