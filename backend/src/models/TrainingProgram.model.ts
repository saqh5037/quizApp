import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

interface TrainingProgramAttributes {
  id: number;
  tenant_id: number;
  classroom_id: number;
  name: string;
  description?: string;
  objectives?: string;
  duration_hours?: number;
  start_date?: Date;
  end_date?: Date;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface TrainingProgramCreationAttributes extends Optional<TrainingProgramAttributes, 'id' | 'description' | 'objectives' | 'duration_hours' | 'start_date' | 'end_date' | 'is_active'> {}

class TrainingProgram extends Model<TrainingProgramAttributes, TrainingProgramCreationAttributes> implements TrainingProgramAttributes {
  public id!: number;
  public tenant_id!: number;
  public classroom_id!: number;
  public name!: string;
  public description?: string;
  public objectives?: string;
  public duration_hours?: number;
  public start_date?: Date;
  public end_date?: Date;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Virtual fields
  public readonly quizCount?: number;
  public readonly completionRate?: number;

  // Associations
  static associate(models: any) {
    TrainingProgram.belongsTo(models.Tenant, {
      foreignKey: 'tenant_id',
      as: 'tenant'
    });

    TrainingProgram.belongsTo(models.Classroom, {
      foreignKey: 'classroom_id',
      as: 'classroom'
    });

    TrainingProgram.hasMany(models.ProgramQuiz, {
      foreignKey: 'program_id',
      as: 'programQuizzes'
    });

    TrainingProgram.belongsToMany(models.Quiz, {
      through: models.ProgramQuiz,
      foreignKey: 'program_id',
      otherKey: 'quiz_id',
      as: 'quizzes'
    });
  }

  static initModel(sequelize: Sequelize): typeof TrainingProgram {
    TrainingProgram.init(
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
        classroom_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'classrooms',
            key: 'id'
          }
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: true,
            len: [2, 255]
          }
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        objectives: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        duration_hours: {
          type: DataTypes.INTEGER,
          allowNull: true,
          validate: {
            min: 1,
            max: 999
          }
        },
        start_date: {
          type: DataTypes.DATE,
          allowNull: true
        },
        end_date: {
          type: DataTypes.DATE,
          allowNull: true,
          validate: {
            isAfterStartDate(value: any) {
              if (value && this.start_date && value <= this.start_date) {
                throw new Error('End date must be after start date');
              }
            }
          }
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        }
      },
      {
        sequelize,
        modelName: 'TrainingProgram',
        tableName: 'training_programs',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    );

    return TrainingProgram;
  }

  // Helper methods
  async getQuizzes(): Promise<any[]> {
    const ProgramQuiz = (this.constructor as any).sequelize.models.ProgramQuiz;
    const Quiz = (this.constructor as any).sequelize.models.Quiz;
    
    const programQuizzes = await ProgramQuiz.findAll({
      where: { program_id: this.id },
      include: [{
        model: Quiz,
        as: 'quiz'
      }],
      order: [['sequence_order', 'ASC']]
    });

    return programQuizzes.map((pq: any) => ({
      ...pq.quiz.get({ plain: true }),
      sequence_order: pq.sequence_order,
      is_mandatory: pq.is_mandatory,
      passing_score: pq.passing_score
    }));
  }

  async addQuiz(quizId: number, order: number, isMandatory: boolean = true, passingScore: number = 70): Promise<any> {
    const ProgramQuiz = (this.constructor as any).sequelize.models.ProgramQuiz;
    
    return ProgramQuiz.create({
      tenant_id: this.tenant_id,
      program_id: this.id,
      quiz_id: quizId,
      sequence_order: order,
      is_mandatory: isMandatory,
      passing_score: passingScore
    });
  }

  async getProgress(userId: number): Promise<{
    totalQuizzes: number;
    completedQuizzes: number;
    averageScore: number;
    progressPercentage: number;
  }> {
    const Quiz = (this.constructor as any).sequelize.models.Quiz;
    const QuizSession = (this.constructor as any).sequelize.models.QuizSession;
    const Participant = (this.constructor as any).sequelize.models.Participant;
    
    const quizzes = await this.getQuizzes();
    const quizIds = quizzes.map((q: any) => q.id);
    
    if (quizIds.length === 0) {
      return {
        totalQuizzes: 0,
        completedQuizzes: 0,
        averageScore: 0,
        progressPercentage: 0
      };
    }

    // Find completed sessions for this user
    const completedSessions = await QuizSession.findAll({
      where: {
        quiz_id: quizIds,
        status: 'ended'
      },
      include: [{
        model: Participant,
        as: 'participants',
        where: { user_id: userId },
        required: true
      }]
    });

    const completedQuizIds = [...new Set(completedSessions.map((s: any) => s.quiz_id))];
    const scores = completedSessions.map((s: any) => {
      const participant = s.participants[0];
      return participant.score || 0;
    });

    const averageScore = scores.length > 0 
      ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length 
      : 0;

    return {
      totalQuizzes: quizzes.length,
      completedQuizzes: completedQuizIds.length,
      averageScore: Math.round(averageScore * 100) / 100,
      progressPercentage: Math.round((completedQuizIds.length / quizzes.length) * 100)
    };
  }

  isOngoing(): boolean {
    const now = new Date();
    if (!this.start_date || !this.end_date) return true;
    return now >= this.start_date && now <= this.end_date;
  }

  hasStarted(): boolean {
    if (!this.start_date) return true;
    return new Date() >= this.start_date;
  }

  hasEnded(): boolean {
    if (!this.end_date) return false;
    return new Date() > this.end_date;
  }
}

export default TrainingProgram;