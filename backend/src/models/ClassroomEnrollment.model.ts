import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

interface ClassroomEnrollmentAttributes {
  id: number;
  tenant_id: number;
  classroom_id: number;
  user_id: number;
  role: 'student' | 'instructor' | 'assistant';
  enrolled_at: Date;
  completed_at?: Date;
  status: 'active' | 'completed' | 'dropped';
}

interface ClassroomEnrollmentCreationAttributes extends Optional<ClassroomEnrollmentAttributes, 'id' | 'role' | 'enrolled_at' | 'completed_at' | 'status'> {}

class ClassroomEnrollment extends Model<ClassroomEnrollmentAttributes, ClassroomEnrollmentCreationAttributes> implements ClassroomEnrollmentAttributes {
  declare id: number;
  declare tenant_id: number;
  declare classroom_id: number;
  declare user_id: number;
  declare role: 'student' | 'instructor' | 'assistant';
  declare enrolled_at: Date;
  declare completed_at?: Date;
  declare status: 'active' | 'completed' | 'dropped';

  // Associations
  static associate(models: any) {
    ClassroomEnrollment.belongsTo(models.Tenant, {
      foreignKey: 'tenant_id',
      as: 'tenant'
    });

    ClassroomEnrollment.belongsTo(models.Classroom, {
      foreignKey: 'classroom_id',
      as: 'classroom'
    });

    ClassroomEnrollment.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  }

  static initModel(sequelize: Sequelize): typeof ClassroomEnrollment {
    ClassroomEnrollment.init(
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
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          }
        },
        role: {
          type: DataTypes.ENUM('student', 'instructor', 'assistant'),
          allowNull: false,
          defaultValue: 'student'
        },
        enrolled_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },
        completed_at: {
          type: DataTypes.DATE,
          allowNull: true
        },
        status: {
          type: DataTypes.ENUM('active', 'completed', 'dropped'),
          allowNull: false,
          defaultValue: 'active'
        }
      },
      {
        sequelize,
        modelName: 'ClassroomEnrollment',
        tableName: 'classroom_enrollments',
        underscored: true,
        timestamps: false,
        indexes: [
          {
            unique: true,
            fields: ['classroom_id', 'user_id']
          }
        ]
      }
    );

    return ClassroomEnrollment;
  }

  // Helper methods
  markAsCompleted(): Promise<ClassroomEnrollment> {
    this.status = 'completed';
    this.completed_at = new Date();
    return this.save();
  }

  markAsDropped(): Promise<ClassroomEnrollment> {
    this.status = 'dropped';
    return this.save();
  }

  reactivate(): Promise<ClassroomEnrollment> {
    this.status = 'active';
    this.completed_at = undefined;
    return this.save();
  }

  isActive(): boolean {
    return this.status === 'active';
  }

  isInstructor(): boolean {
    return this.role === 'instructor';
  }

  isStudent(): boolean {
    return this.role === 'student';
  }

  isAssistant(): boolean {
    return this.role === 'assistant';
  }
}

export default ClassroomEnrollment;