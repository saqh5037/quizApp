import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { QuizType } from '../config/constants';

interface QuestionAttributes {
  id: number;
  quizId: number;
  questionText: string;
  questionType: 'multiple_choice' | 'true_false' | 'short_answer' | 'multiple_select' | 'ordering' | 'matching' | 'dropdown' | 'multiple_choice_grid' | 'checkbox_grid';
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
  public questionType!: 'multiple_choice' | 'true_false' | 'short_answer' | 'multiple_select' | 'ordering' | 'matching' | 'dropdown' | 'multiple_choice_grid' | 'checkbox_grid';
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

    if (this.questionType === 'dropdown' || this.questionType === 'multiple_choice') {
      if (Array.isArray(this.correctAnswers)) {
        return Number(answer) === Number(this.correctAnswers[0]);
      }
      return String(answer).toLowerCase() === String(this.correctAnswers).toLowerCase();
    }

    if (this.questionType === 'multiple_select') {
      if (!Array.isArray(answer) || !Array.isArray(this.correctAnswers)) return false;
      const sortedUser = [...answer].map(Number).sort((a, b) => a - b);
      const sortedCorrect = [...this.correctAnswers].map(Number).sort((a, b) => a - b);
      return JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect);
    }

    if (this.questionType === 'multiple_choice_grid') {
      if (typeof answer !== 'object' || typeof this.correctAnswers !== 'object') return false;
      const rows = Object.keys(this.correctAnswers);
      return rows.every(row => Number(answer[row]) === Number(this.correctAnswers[row]));
    }

    if (this.questionType === 'checkbox_grid') {
      if (typeof answer !== 'object' || typeof this.correctAnswers !== 'object') return false;
      const rows = Object.keys(this.correctAnswers);
      return rows.every(row => {
        const userRow = (answer[row] || []).map(Number).sort((a: number, b: number) => a - b);
        const correctRow = (this.correctAnswers[row] || []).map(Number).sort((a: number, b: number) => a - b);
        return JSON.stringify(userRow) === JSON.stringify(correctRow);
      });
    }

    // Fallback for short_answer and others
    if (Array.isArray(this.correctAnswers)) {
      if (Array.isArray(answer)) {
        return JSON.stringify(answer.sort()) === JSON.stringify(this.correctAnswers.sort());
      }
      return this.correctAnswers.some((ca: any) =>
        String(ca).toLowerCase().trim() === String(answer).toLowerCase().trim()
      );
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
      type: DataTypes.ENUM('multiple_choice', 'true_false', 'short_answer', 'multiple_select', 'ordering', 'matching', 'dropdown', 'multiple_choice_grid', 'checkbox_grid'),
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