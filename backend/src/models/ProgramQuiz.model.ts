import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

interface ProgramQuizAttributes {
  id: number;
  tenant_id: number;
  program_id: number;
  quiz_id: number;
  sequence_order: number;
  is_mandatory: boolean;
  passing_score: number;
  created_at?: Date;
}

interface ProgramQuizCreationAttributes extends Optional<ProgramQuizAttributes, 'id' | 'is_mandatory' | 'passing_score'> {}

class ProgramQuiz extends Model<ProgramQuizAttributes, ProgramQuizCreationAttributes> implements ProgramQuizAttributes {
  public id!: number;
  public tenant_id!: number;
  public program_id!: number;
  public quiz_id!: number;
  public sequence_order!: number;
  public is_mandatory!: boolean;
  public passing_score!: number;
  public readonly created_at!: Date;

  // Associations
  static associate(models: any) {
    ProgramQuiz.belongsTo(models.Tenant, {
      foreignKey: 'tenant_id',
      as: 'tenant'
    });

    ProgramQuiz.belongsTo(models.TrainingProgram, {
      foreignKey: 'program_id',
      as: 'program'
    });

    ProgramQuiz.belongsTo(models.Quiz, {
      foreignKey: 'quiz_id',
      as: 'quiz'
    });
  }

  static initModel(sequelize: Sequelize): typeof ProgramQuiz {
    ProgramQuiz.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        tenant_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'tenants',
            key: 'id'
          }
        },
        program_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'training_programs',
            key: 'id'
          }
        },
        quiz_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'quizzes',
            key: 'id'
          }
        },
        sequence_order: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            min: 1
          }
        },
        is_mandatory: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        passing_score: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 70,
          validate: {
            min: 0,
            max: 100
          }
        }
      },
      {
        sequelize,
        modelName: 'ProgramQuiz',
        tableName: 'program_quizzes',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
          {
            unique: true,
            fields: ['program_id', 'quiz_id']
          },
          {
            unique: true,
            fields: ['program_id', 'sequence_order']
          }
        ]
      }
    );

    return ProgramQuiz;
  }

  // Helper methods
  async checkUserPassed(userId: number): Promise<boolean> {
    const QuizSession = (this.constructor as any).sequelize.models.QuizSession;
    const Participant = (this.constructor as any).sequelize.models.Participant;
    
    const sessions = await QuizSession.findAll({
      where: {
        quiz_id: this.quiz_id,
        status: 'ended'
      },
      include: [{
        model: Participant,
        as: 'participants',
        where: { user_id: userId },
        required: true
      }],
      order: [['created_at', 'DESC']],
      limit: 1
    });

    if (sessions.length === 0) {
      return false;
    }

    const participant = sessions[0].participants[0];
    return (participant.score || 0) >= this.passing_score;
  }

  async getUserBestScore(userId: number): Promise<number | null> {
    const QuizSession = (this.constructor as any).sequelize.models.QuizSession;
    const Participant = (this.constructor as any).sequelize.models.Participant;
    
    const sessions = await QuizSession.findAll({
      where: {
        quiz_id: this.quiz_id,
        status: 'ended'
      },
      include: [{
        model: Participant,
        as: 'participants',
        where: { user_id: userId },
        required: true
      }]
    });

    if (sessions.length === 0) {
      return null;
    }

    const scores = sessions.map((s: any) => s.participants[0].score || 0);
    return Math.max(...scores);
  }

  async canUserProceed(userId: number): Promise<boolean> {
    if (!this.is_mandatory) {
      return true;
    }
    return this.checkUserPassed(userId);
  }
}

export default ProgramQuiz;