import {
  Model,
  DataTypes,
  Sequelize,
  Optional,
  BelongsToGetAssociationMixin
} from 'sequelize';

interface InteractiveVideoAnswerAttributes {
  id: number;
  resultId: number;
  momentId: string;
  questionText: string;
  userAnswer?: string;
  correctAnswer?: string;
  isCorrect: boolean;
  responseTimeSeconds?: number;
  attemptNumber: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface InteractiveVideoAnswerCreationAttributes
  extends Optional<
    InteractiveVideoAnswerAttributes,
    | 'id'
    | 'userAnswer'
    | 'correctAnswer'
    | 'isCorrect'
    | 'responseTimeSeconds'
    | 'attemptNumber'
    | 'createdAt'
    | 'updatedAt'
  > {}

class InteractiveVideoAnswer
  extends Model<InteractiveVideoAnswerAttributes, InteractiveVideoAnswerCreationAttributes>
  implements InteractiveVideoAnswerAttributes {
  declare id: number;
  declare resultId: number;
  declare momentId: string;
  declare questionText: string;
  declare userAnswer?: string;
  declare correctAnswer?: string;
  declare isCorrect: boolean;
  declare responseTimeSeconds?: number;
  declare attemptNumber: number;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  // Associations
  declare getResult: BelongsToGetAssociationMixin<any>;

  static initModel(sequelize: Sequelize): typeof InteractiveVideoAnswer {
    InteractiveVideoAnswer.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        resultId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'result_id',
          references: {
            model: 'interactive_video_results',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        momentId: {
          type: DataTypes.STRING(50),
          allowNull: false,
          field: 'moment_id'
        },
        questionText: {
          type: DataTypes.TEXT,
          allowNull: false,
          field: 'question_text'
        },
        userAnswer: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'user_answer'
        },
        correctAnswer: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'correct_answer'
        },
        isCorrect: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          field: 'is_correct'
        },
        responseTimeSeconds: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'response_time_seconds'
        },
        attemptNumber: {
          type: DataTypes.INTEGER,
          defaultValue: 1,
          field: 'attempt_number'
        }
      },
      {
        sequelize,
        modelName: 'InteractiveVideoAnswer',
        tableName: 'interactive_video_answers',
        timestamps: true,
        underscored: true,
        indexes: [
          { fields: ['result_id'] },
          { fields: ['moment_id'] },
          { fields: ['is_correct'] }
        ]
      }
    );

    return InteractiveVideoAnswer;
  }

  static associate(models: any) {
    // Associations are already defined in associations.ts
    // Just set the model references for TypeScript
    this.associations = {};
  }
}

export default InteractiveVideoAnswer;