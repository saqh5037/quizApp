import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface QuizAttributes {
  id: number;
  title: string;
  description?: string;
  category?: string;
  coverImage?: string;
  timeLimit?: number; // in seconds
  passingScore?: number; // percentage
  isPublic: boolean;
  isActive: boolean;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showResults: boolean;
  showCorrectAnswers: boolean;
  allowRetake: boolean;
  maxAttempts?: number;
  userId: number;
  totalQuestions?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface QuizCreationAttributes extends Optional<
  QuizAttributes, 
  'id' | 'isPublic' | 'isActive' | 'shuffleQuestions' | 'shuffleAnswers' | 
  'showResults' | 'showCorrectAnswers' | 'allowRetake'
> {}

class Quiz extends Model<QuizAttributes, QuizCreationAttributes> implements QuizAttributes {
  public id!: number;
  public title!: string;
  public description?: string;
  public category?: string;
  public coverImage?: string;
  public timeLimit?: number;
  public passingScore?: number;
  public isPublic!: boolean;
  public isActive!: boolean;
  public shuffleQuestions!: boolean;
  public shuffleAnswers!: boolean;
  public showResults!: boolean;
  public showCorrectAnswers!: boolean;
  public allowRetake!: boolean;
  public maxAttempts?: number;
  public userId!: number;
  public totalQuestions?: number;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Quiz.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 255],
      },
    },
    description: {
      type: DataTypes.TEXT,
    },
    category: {
      type: DataTypes.STRING(100),
    },
    coverImage: {
      type: DataTypes.STRING(500),
      field: 'cover_image',
    },
    timeLimit: {
      type: DataTypes.INTEGER,
      field: 'time_limit',
      comment: 'Time limit in seconds for the entire quiz',
    },
    passingScore: {
      type: DataTypes.INTEGER,
      field: 'passing_score',
      defaultValue: 70,
      validate: {
        min: 0,
        max: 100,
      },
      comment: 'Minimum percentage score to pass',
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      field: 'is_public',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: 'is_active',
    },
    shuffleQuestions: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      field: 'shuffle_questions',
    },
    shuffleAnswers: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: 'shuffle_answers',
    },
    showResults: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: 'show_results',
      comment: 'Show results immediately after quiz completion',
    },
    showCorrectAnswers: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: 'show_correct_answers',
      comment: 'Show correct answers in results',
    },
    allowRetake: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: 'allow_retake',
    },
    maxAttempts: {
      type: DataTypes.INTEGER,
      field: 'max_attempts',
      comment: 'Maximum number of attempts allowed',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    totalQuestions: {
      type: DataTypes.VIRTUAL,
      field: 'total_questions',
    },
  },
  {
    sequelize,
    modelName: 'Quiz',
    tableName: 'quizzes',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['category'],
      },
      {
        fields: ['is_public', 'is_active'],
      },
    ],
  }
);

export default Quiz;