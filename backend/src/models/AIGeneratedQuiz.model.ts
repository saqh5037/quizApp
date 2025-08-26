import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface AIGeneratedQuizAttributes {
  id: number;
  title: string;
  description?: string;
  difficulty?: string;
  question_count?: number;
  questions?: any;
  status: string;
  user_id?: number;
  manual_id?: number;
  metadata?: any;
  created_at?: Date;
  updated_at?: Date;
}

interface AIGeneratedQuizCreationAttributes extends Optional<AIGeneratedQuizAttributes, 'id'> {}

class AIGeneratedQuiz extends Model<AIGeneratedQuizAttributes, AIGeneratedQuizCreationAttributes> 
  implements AIGeneratedQuizAttributes {
  declare id: number;
  declare title: string;
  declare description?: string;
  declare difficulty?: string;
  declare question_count?: number;
  declare questions?: any;
  declare status: string;
  declare user_id?: number;
  declare manual_id?: number;
  declare metadata?: any;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;

  static sequelize = sequelize;
}

AIGeneratedQuiz.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    difficulty: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    question_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    questions: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'pending',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    manual_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
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
    tableName: 'ai_generated_quizzes',
    timestamps: false,
    underscored: true,
  }
);

export default AIGeneratedQuiz;
