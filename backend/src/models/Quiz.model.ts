import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface QuizAttributes {
  id: number;
  title: string;
  description?: string;
  coverImageUrl?: string;
  creatorId?: number;
  organizationId?: number;
  tenantId?: number;
  category?: string;
  tags?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  estimatedTimeMinutes?: number;
  passPercentage?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showCorrectAnswers?: boolean;
  showScore?: boolean;
  allowReview?: boolean;
  timeLimitMinutes?: number;
  instructions?: string;
  settings?: Record<string, any>;
  isPublic?: boolean;
  isActive?: boolean;
  totalQuestions?: number;
  totalPoints?: number;
  timesTaken?: number;
  averageScore?: number;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface QuizCreationAttributes extends Optional<
  QuizAttributes, 
  'id' | 'creatorId' | 'organizationId' | 'isPublic' | 'isActive' | 
  'shuffleQuestions' | 'shuffleOptions' | 'showCorrectAnswers' | 'showScore' | 
  'allowReview' | 'totalQuestions' | 'totalPoints' | 'timesTaken' | 'averageScore'
> {}

class Quiz extends Model<QuizAttributes, QuizCreationAttributes> implements QuizAttributes {
  declare id: number;
  declare title: string;
  declare description?: string;
  declare coverImageUrl?: string;
  declare creatorId?: number;
  declare organizationId?: number;
  declare tenantId?: number;
  declare category?: string;
  declare tags?: string[];
  declare difficulty?: 'easy' | 'medium' | 'hard';
  declare estimatedTimeMinutes?: number;
  declare passPercentage?: number;
  declare maxAttempts?: number;
  declare shuffleQuestions?: boolean;
  declare shuffleOptions?: boolean;
  declare showCorrectAnswers?: boolean;
  declare showScore?: boolean;
  declare allowReview?: boolean;
  declare timeLimitMinutes?: number;
  declare instructions?: string;
  declare settings?: Record<string, any>;
  declare isPublic?: boolean;
  declare isActive?: boolean;
  declare totalQuestions?: number;
  declare totalPoints?: number;
  declare timesTaken?: number;
  declare averageScore?: number;
  declare metadata?: Record<string, any>;
  
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare readonly deletedAt?: Date | null;
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
    coverImageUrl: {
      type: DataTypes.TEXT,
      field: 'cover_image_url',
    },
    timeLimitMinutes: {
      type: DataTypes.INTEGER,
      field: 'time_limit_minutes',
    },
    estimatedTimeMinutes: {
      type: DataTypes.INTEGER,
      field: 'estimated_time_minutes',
    },
    passPercentage: {
      type: DataTypes.INTEGER,
      field: 'pass_percentage',
      defaultValue: 70,
      validate: {
        min: 0,
        max: 100,
      },
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
    shuffleOptions: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'shuffle_options',
    },
    showScore: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'show_score',
    },
    showCorrectAnswers: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: 'show_correct_answers',
      comment: 'Show correct answers in results',
    },
    allowReview: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'allow_review',
    },
    maxAttempts: {
      type: DataTypes.INTEGER,
      field: 'max_attempts',
      comment: 'Maximum number of attempts allowed',
    },
    creatorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'creator_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    organizationId: {
      type: DataTypes.INTEGER,
      field: 'organization_id',
      references: {
        model: 'organizations',
        key: 'id',
      },
    },
    tenantId: {
      type: DataTypes.INTEGER,
      field: 'tenant_id',
      allowNull: true,
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
    },
    difficulty: {
      type: DataTypes.ENUM('easy', 'medium', 'hard'),
    },
    instructions: {
      type: DataTypes.TEXT,
    },
    settings: {
      type: DataTypes.JSONB,
    },
    totalQuestions: {
      type: DataTypes.INTEGER,
      field: 'total_questions',
      defaultValue: 0,
    },
    totalPoints: {
      type: DataTypes.INTEGER,
      field: 'total_points',
      defaultValue: 0,
    },
    timesTaken: {
      type: DataTypes.INTEGER,
      field: 'times_taken',
      defaultValue: 0,
    },
    averageScore: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'average_score',
      defaultValue: 0,
    },
    metadata: {
      type: DataTypes.JSONB,
    },
  },
  {
    sequelize,
    modelName: 'Quiz',
    tableName: 'quizzes',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        fields: ['creator_id'],
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