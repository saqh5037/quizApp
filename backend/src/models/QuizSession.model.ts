import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { SessionStatus } from '../config/constants';

interface QuizSessionAttributes {
  id: number;
  sessionCode: string;
  quizId: number;
  hostId: number;
  status: SessionStatus;
  currentQuestionIndex: number;
  showLeaderboard: boolean;
  allowLateJoin: boolean;
  startedAt?: Date;
  endedAt?: Date;
  qrCode?: string;
  maxParticipants?: number;
  settings?: {
    randomizeQuestions?: boolean;
    randomizeAnswers?: boolean;
    showCorrectAnswer?: boolean;
    showExplanation?: boolean;
    autoAdvance?: boolean;
    autoAdvanceDelay?: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface QuizSessionCreationAttributes extends Optional<
  QuizSessionAttributes,
  'id' | 'status' | 'currentQuestionIndex' | 'showLeaderboard' | 'allowLateJoin'
> {}

class QuizSession extends Model<QuizSessionAttributes, QuizSessionCreationAttributes> 
  implements QuizSessionAttributes {
  public id!: number;
  public sessionCode!: string;
  public quizId!: number;
  public hostId!: number;
  public status!: SessionStatus;
  public currentQuestionIndex!: number;
  public showLeaderboard!: boolean;
  public allowLateJoin!: boolean;
  public startedAt?: Date;
  public endedAt?: Date;
  public qrCode?: string;
  public maxParticipants?: number;
  public settings?: {
    randomizeQuestions?: boolean;
    randomizeAnswers?: boolean;
    showCorrectAnswer?: boolean;
    showExplanation?: boolean;
    autoAdvance?: boolean;
    autoAdvanceDelay?: number;
  };
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Helper methods
  public isActive(): boolean {
    return this.status === 'active';
  }

  public canJoin(): boolean {
    return (this.status === 'waiting' || (this.status === 'active' && this.allowLateJoin));
  }
}

QuizSession.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    sessionCode: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
      field: 'session_code',
    },
    quizId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'quiz_id',
      references: {
        model: 'quizzes',
        key: 'id',
      },
    },
    hostId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'host_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('waiting', 'active', 'paused', 'completed'),
      defaultValue: 'waiting',
      allowNull: false,
    },
    currentQuestionIndex: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      field: 'current_question_index',
    },
    showLeaderboard: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: 'show_leaderboard',
    },
    allowLateJoin: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: 'allow_late_join',
    },
    startedAt: {
      type: DataTypes.DATE,
      field: 'started_at',
    },
    endedAt: {
      type: DataTypes.DATE,
      field: 'ended_at',
    },
    qrCode: {
      type: DataTypes.TEXT,
      field: 'qr_code',
      comment: 'Base64 encoded QR code image',
    },
    maxParticipants: {
      type: DataTypes.INTEGER,
      field: 'max_participants',
      defaultValue: 100,
    },
    settings: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
  },
  {
    sequelize,
    modelName: 'QuizSession',
    tableName: 'quiz_sessions',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['session_code'],
        unique: true,
      },
      {
        fields: ['quiz_id'],
      },
      {
        fields: ['host_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['created_at'],
      },
    ],
  }
);

export default QuizSession;