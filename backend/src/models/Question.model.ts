import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { QuizType } from '../config/constants';

interface QuestionAttributes {
  id: number;
  quizId: number;
  questionText: string;
  questionType: 'multiple_choice' | 'true_false' | 'short_answer' | 'multiple_select' | 'ordering' | 'matching';
  questionImageUrl?: string;
  explanation?: string;
  hint?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  points?: number;
  negativePoints?: number;
  timeLimitSeconds?: number;
  orderPosition: number;
  isRequired?: boolean;
  options: any;
  correctAnswers: any;
  validationRules?: any;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface QuestionCreationAttributes extends Optional<
  QuestionAttributes, 
  'id' | 'points' | 'orderPosition' | 'isRequired' | 'negativePoints' | 'difficulty'
> {}

class Question extends Model<QuestionAttributes, QuestionCreationAttributes> implements QuestionAttributes {
  public id!: number;
  public quizId!: number;
  public questionText!: string;
  public questionType!: 'multiple_choice' | 'true_false' | 'short_answer' | 'multiple_select' | 'ordering' | 'matching';
  public questionImageUrl?: string;
  public explanation?: string;
  public hint?: string;
  public difficulty?: 'easy' | 'medium' | 'hard';
  public points?: number;
  public negativePoints?: number;
  public timeLimitSeconds?: number;
  public orderPosition!: number;
  public isRequired?: boolean;
  public options!: any;
  public correctAnswers!: any;
  public validationRules?: any;
  public metadata?: Record<string, any>;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Helper methods
  public isCorrectAnswer(answer: any): boolean {
    if (this.questionType === 'true_false') {
      return String(answer).toLowerCase() === String(this.correctAnswers).toLowerCase();
    }
    
    if (Array.isArray(this.correctAnswers)) {
      if (Array.isArray(answer)) {
        return JSON.stringify(answer.sort()) === JSON.stringify(this.correctAnswers.sort());
      }
      return false;
    }
    
    return String(answer).toLowerCase() === String(this.correctAnswers).toLowerCase();
  }
}

Question.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    quizId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'quiz_id',
      references: {
        model: 'quizzes',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    questionText: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'question_text',
      validate: {
        notEmpty: true,
      },
    },
    questionType: {
      type: DataTypes.ENUM('multiple_choice', 'true_false', 'short_answer', 'multiple_select', 'ordering', 'matching'),
      allowNull: false,
      field: 'question_type',
    },
    questionImageUrl: {
      type: DataTypes.TEXT,
      field: 'question_image_url',
    },
    hint: {
      type: DataTypes.TEXT,
    },
    difficulty: {
      type: DataTypes.ENUM('easy', 'medium', 'hard'),
    },
    negativePoints: {
      type: DataTypes.INTEGER,
      field: 'negative_points',
      defaultValue: 0,
    },
    timeLimitSeconds: {
      type: DataTypes.INTEGER,
      field: 'time_limit_seconds',
    },
    isRequired: {
      type: DataTypes.BOOLEAN,
      field: 'is_required',
      defaultValue: false,
    },
    options: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    correctAnswers: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: 'correct_answers',
    },
    validationRules: {
      type: DataTypes.JSONB,
      field: 'validation_rules',
    },
    metadata: {
      type: DataTypes.JSONB,
    },
    explanation: {
      type: DataTypes.TEXT,
    },
    points: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    orderPosition: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      field: 'order_position',
    },
  },
  {
    sequelize,
    modelName: 'Question',
    tableName: 'questions',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['quiz_id'],
      },
      {
        fields: ['quiz_id', 'order_position'],
      },
    ],
  }
);

export default Question;