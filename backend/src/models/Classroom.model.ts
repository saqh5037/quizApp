import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

interface ClassroomAttributes {
  id: number;
  tenant_id: number;
  name: string;
  code: string;
  description?: string;
  instructor_id?: number;
  max_capacity: number;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface ClassroomCreationAttributes extends Optional<ClassroomAttributes, 'id' | 'description' | 'instructor_id' | 'max_capacity' | 'is_active'> {}

class Classroom extends Model<ClassroomAttributes, ClassroomCreationAttributes> implements ClassroomAttributes {
  declare id: number;
  declare tenant_id: number;
  declare name: string;
  declare code: string;
  declare description?: string;
  declare instructor_id?: number;
  declare max_capacity: number;
  declare is_active: boolean;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;

  // Virtual fields
  public readonly enrollmentCount?: number;
  public readonly availableSeats?: number;

  // Associations
  static associate(models: any) {
    Classroom.belongsTo(models.Tenant, {
      foreignKey: 'tenant_id',
      as: 'tenant'
    });

    Classroom.belongsTo(models.User, {
      foreignKey: 'instructor_id',
      as: 'instructor'
    });

    Classroom.hasMany(models.TrainingProgram, {
      foreignKey: 'classroom_id',
      as: 'trainingPrograms'
    });

    Classroom.hasMany(models.ClassroomEnrollment, {
      foreignKey: 'classroom_id',
      as: 'enrollments'
    });

    Classroom.belongsToMany(models.User, {
      through: models.ClassroomEnrollment,
      foreignKey: 'classroom_id',
      otherKey: 'user_id',
      as: 'students'
    });
  }

  static initModel(sequelize: Sequelize): typeof Classroom {
    Classroom.init(
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
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: true,
            len: [2, 255]
          }
        },
        code: {
          type: DataTypes.STRING(50),
          allowNull: false,
          unique: true,
          validate: {
            notEmpty: true,
            len: [3, 50]
          }
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        instructor_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          }
        },
        max_capacity: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 50,
          validate: {
            min: 1,
            max: 1000
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
        modelName: 'Classroom',
        tableName: 'classrooms',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        hooks: {
          beforeCreate: async (classroom: Classroom) => {
            // Generate unique code if not provided
            if (!classroom.code) {
              const tenant = await sequelize.models.Tenant.findByPk(classroom.tenant_id);
              const prefix = tenant?.get('slug')?.toString().toUpperCase().substring(0, 3) || 'CLS';
              const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
              classroom.code = `${prefix}-${random}`;
            }
          }
        }
      }
    );

    return Classroom;
  }

  // Helper methods
  async getEnrollmentCount(): Promise<number> {
    const enrollments = await (this.constructor as any).sequelize.models.ClassroomEnrollment.count({
      where: {
        classroom_id: this.id,
        status: 'active'
      }
    });
    return enrollments;
  }

  async getAvailableSeats(): Promise<number> {
    const enrolled = await this.getEnrollmentCount();
    return Math.max(0, this.max_capacity - enrolled);
  }

  async hasCapacity(): Promise<boolean> {
    const available = await this.getAvailableSeats();
    return available > 0;
  }

  async enrollStudent(userId: number, role: string = 'student'): Promise<any> {
    const ClassroomEnrollment = (this.constructor as any).sequelize.models.ClassroomEnrollment;
    
    // Check if already enrolled
    const existing = await ClassroomEnrollment.findOne({
      where: {
        classroom_id: this.id,
        user_id: userId
      }
    });

    if (existing) {
      throw new Error('User already enrolled in this classroom');
    }

    // Check capacity
    if (role === 'student') {
      const hasSpace = await this.hasCapacity();
      if (!hasSpace) {
        throw new Error('Classroom is at full capacity');
      }
    }

    // Create enrollment
    return ClassroomEnrollment.create({
      tenant_id: this.tenant_id,
      classroom_id: this.id,
      user_id: userId,
      role: role,
      status: 'active'
    });
  }
}

export default Classroom;