import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface AnswerAttributes {
  id: number;
  participantId: number;
  questionId: number;
  sessionId: number;
  tenantId: number; // Multi-tenant support
  answer: string | boolean | string[];
  isCorrect: boolean;
  points: number;
  responseTime: number; // in seconds
  answeredAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AnswerCreationAttributes extends Optional<
  AnswerAttributes,
  'id' | 'isCorrect' | 'points' | 'answeredAt'
> {}

class Answer extends Model<AnswerAttributes, AnswerCreationAttributes>
  implements AnswerAttributes {
  public id!: number;
  public participantId!: number;
  public questionId!: number;
  public sessionId!: number;
  public tenantId!: number;
  public answer!: string | boolean | string[];
  public isCorrect!: boolean;
  public points!: number;
  public responseTime!: number;
  public answeredAt!: Date;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Calculate points based on response time (bonus for quick answers)
  public calculatePoints(basePoints: number, maxTime: number): number {
    if (!this.isCorrect) return 0;
    
    // Give bonus points for quick responses
    const timeBonus = Math.max(0, 1 - (this.responseTime / maxTime)) * 0.5;
    return Math.round(basePoints * (1 + timeBonus));
  }
}

Answer.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    participantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'participant_id',
      references: {
        model: 'participants',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    questionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'question_id',
      references: {
        model: 'questions',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'session_id',
      references: {
        model: 'quiz_sessions',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    tenantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'tenant_id',
      references: {
        model: 'tenants',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    answer: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    isCorrect: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      field: 'is_correct',
    },
    points: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    responseTime: {
      type: DataTypes.FLOAT,
      allowNull: false,
      field: 'response_time',
      comment: 'Response time in seconds',
    },
    answeredAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
      field: 'answered_at',
    },
  },
  {
    sequelize,
    modelName: 'Answer',
    tableName: 'answers',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['participant_id'],
      },
      {
        fields: ['question_id'],
      },
      {
        fields: ['session_id'],
      },
      {
        fields: ['tenant_id'],
      },
      {
        fields: ['participant_id', 'question_id'],
        unique: true,
      },
      {
        fields: ['is_correct'],
      },
      {
        fields: ['tenant_id', 'session_id'],
      },
    ],
  }
);

export default Answer;