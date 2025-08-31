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

class StudyGuide extends Model<
  InferAttributes<StudyGuide>,
  InferCreationAttributes<StudyGuide>
> {
  declare id: CreationOptional<number>;
  declare manual_id: ForeignKey<Manual['id']>;
  declare user_id: ForeignKey<User['id']>;
  declare title: string;
  declare description: CreationOptional<string | null>;
  declare content: string; // JSON structure with sections, objectives, key concepts, etc.
  declare difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  declare estimated_time: number; // in minutes
  declare topics: string[]; // Array of main topics covered
  declare learning_objectives: string[]; // Array of learning objectives
  declare is_public: CreationOptional<boolean>;
  declare status: CreationOptional<'generating' | 'ready' | 'failed'>;
  declare metadata: CreationOptional<any>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Associations
  declare manual?: NonAttribute<Manual>;
  declare user?: NonAttribute<User>;

  declare static associations: {
    manual: Association<StudyGuide, Manual>;
    user: Association<StudyGuide, User>;
  };
}

StudyGuide.init(
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
      defaultValue: 'Generando guía de estudio...'
    },
    difficulty_level: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
      allowNull: false,
      defaultValue: 'beginner'
    },
    estimated_time: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 5,
        max: 1440 // Max 24 hours
      }
    },
    topics: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    learning_objectives: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM('generating', 'ready', 'failed'),
      defaultValue: 'generating',
      allowNull: false,
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
    tableName: 'study_guides',
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
        fields: ['difficulty_level']
      },
      {
        fields: ['is_public']
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

export default StudyGuide;