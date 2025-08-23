import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { QuizType } from '../config/constants';

interface QuestionAttributes {
  id: number;
  quizId: number;
  type: QuizType;
  question: string;
  options?: string[]; // For multiple choice
  correctAnswer: string | boolean | string[]; // Can be string, boolean (for true/false), or array (for multiple correct)
  explanation?: string;
  points: number;
  timeLimit?: number; // in seconds
  order: number;
  imageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface QuestionCreationAttributes extends Optional<
  QuestionAttributes, 
  'id' | 'points' | 'order'
> {}

class Question extends Model<QuestionAttributes, QuestionCreationAttributes> implements QuestionAttributes {
  public id!: number;
  public quizId!: number;
  public type!: QuizType;
  public question!: string;
  public options?: string[];
  public correctAnswer!: string | boolean | string[];
  public explanation?: string;
  public points!: number;
  public timeLimit?: number;
  public order!: number;
  public imageUrl?: string;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Helper methods
  public isCorrectAnswer(answer: any): boolean {
    if (this.type === 'true_false') {
      return String(answer).toLowerCase() === String(this.correctAnswer).toLowerCase();
    }
    
    if (Array.isArray(this.correctAnswer)) {
      if (Array.isArray(answer)) {
        return JSON.stringify(answer.sort()) === JSON.stringify(this.correctAnswer.sort());
      }
      return false;
    }
    
    return String(answer).toLowerCase() === String(this.correctAnswer).toLowerCase();
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
    type: {
      type: DataTypes.ENUM('multiple_choice', 'true_false', 'short_answer'),
      allowNull: false,
    },
    question: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    options: {
      type: DataTypes.JSON,
      validate: {
        isValidOptions(value: any) {
          if (this.type === 'multiple_choice' && (!Array.isArray(value) || value.length < 2)) {
            throw new Error('Multiple choice questions must have at least 2 options');
          }
        },
      },
    },
    correctAnswer: {
      type: DataTypes.JSON,
      allowNull: false,
      field: 'correct_answer',
      validate: {
        notEmpty: true,
      },
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
    timeLimit: {
      type: DataTypes.INTEGER,
      field: 'time_limit',
      comment: 'Time limit in seconds for this specific question',
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    imageUrl: {
      type: DataTypes.STRING(500),
      field: 'image_url',
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
        fields: ['quiz_id', 'order'],
      },
    ],
  }
);

export default Question;