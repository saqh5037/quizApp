import { 
  Model, 
  DataTypes, 
  InferAttributes, 
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
  NonAttribute,
  Association
} from 'sequelize';
import { sequelize } from '../config/database';
import Manual from './Manual.model';
import User from './User.model';

class ManualSummary extends Model<
  InferAttributes<ManualSummary>,
  InferCreationAttributes<ManualSummary>
> {
  declare id: CreationOptional<number>;
  declare manual_id: ForeignKey<Manual['id']>;
  declare user_id: ForeignKey<User['id']>;
  declare title: string;
  declare summary_type: 'brief' | 'detailed' | 'key_points';
  declare content: string;
  declare word_count: number;
  declare status: CreationOptional<'generating' | 'ready' | 'failed'>;
  declare generation_prompt: CreationOptional<string | null>;
  declare metadata: CreationOptional<any>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Associations
  declare manual?: NonAttribute<Manual>;
  declare user?: NonAttribute<User>;

  declare static associations: {
    manual: Association<ManualSummary, Manual>;
    user: Association<ManualSummary, User>;
  };
}

ManualSummary.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    manual_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'manuals',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    summary_type: {
      type: DataTypes.ENUM('brief', 'detailed', 'key_points'),
      allowNull: false,
      defaultValue: 'brief'
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    word_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    status: {
      type: DataTypes.ENUM('generating', 'ready', 'failed'),
      defaultValue: 'generating',
      allowNull: false,
    },
    generation_prompt: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'manual_summaries',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['manual_id']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['summary_type']
      },
      {
        fields: ['status']
      },
      {
        fields: ['created_at']
      }
    ],
  }
);

export default ManualSummary;