import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { ParticipantStatus } from '../config/constants';

interface ParticipantAttributes {
  id: number;
  sessionId: number;
  userId?: number; // Optional - can be a guest
  tenantId: number; // Multi-tenant support
  nickname: string;
  status: ParticipantStatus;
  score: number;
  answeredQuestions: number;
  correctAnswers: number;
  averageResponseTime: number; // in seconds
  joinedAt: Date;
  finishedAt?: Date;
  socketId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ParticipantCreationAttributes extends Optional<
  ParticipantAttributes,
  'id' | 'status' | 'score' | 'answeredQuestions' | 'correctAnswers' | 'averageResponseTime' | 'joinedAt'
> {}

class Participant extends Model<ParticipantAttributes, ParticipantCreationAttributes>
  implements ParticipantAttributes {
  public id!: number;
  public sessionId!: number;
  public userId?: number;
  public tenantId!: number;
  public nickname!: string;
  public status!: ParticipantStatus;
  public score!: number;
  public answeredQuestions!: number;
  public correctAnswers!: number;
  public averageResponseTime!: number;
  public joinedAt!: Date;
  public finishedAt?: Date;
  public socketId?: string;
  public ipAddress?: string;
  public userAgent?: string;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Helper methods
  public get accuracy(): number {
    if (this.answeredQuestions === 0) return 0;
    return Math.round((this.correctAnswers / this.answeredQuestions) * 100);
  }

  public isActive(): boolean {
    return this.status === 'active';
  }

  public updateScore(points: number, responseTime: number): void {
    this.score += points;
    this.answeredQuestions += 1;
    
    // Update average response time
    const totalTime = this.averageResponseTime * (this.answeredQuestions - 1) + responseTime;
    this.averageResponseTime = totalTime / this.answeredQuestions;
  }
}

Participant.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
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
    userId: {
      type: DataTypes.INTEGER,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
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
    nickname: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 50],
      },
    },
    status: {
      type: DataTypes.ENUM('waiting', 'active', 'disconnected', 'finished'),
      defaultValue: 'waiting',
      allowNull: false,
    },
    score: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    answeredQuestions: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      field: 'answered_questions',
    },
    correctAnswers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      field: 'correct_answers',
    },
    averageResponseTime: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      allowNull: false,
      field: 'average_response_time',
      comment: 'Average response time in seconds',
    },
    joinedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
      field: 'joined_at',
    },
    finishedAt: {
      type: DataTypes.DATE,
      field: 'finished_at',
    },
    socketId: {
      type: DataTypes.STRING(255),
      field: 'socket_id',
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      field: 'ip_address',
    },
    userAgent: {
      type: DataTypes.STRING(500),
      field: 'user_agent',
    },
  },
  {
    sequelize,
    modelName: 'Participant',
    tableName: 'participants',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['session_id'],
      },
      {
        fields: ['user_id'],
      },
      {
        fields: ['tenant_id'],
      },
      {
        fields: ['session_id', 'nickname'],
        unique: true,
      },
      {
        fields: ['socket_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['tenant_id', 'status'],
      },
    ],
  }
);

export default Participant;