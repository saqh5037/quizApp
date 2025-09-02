import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

interface TenantUserAttributes {
  id: number;
  tenant_id: number;
  user_id: number;
  role: 'tenant_owner' | 'tenant_admin' | 'instructor' | 'student';
  permissions: string[];
  joined_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

interface TenantUserCreationAttributes extends Optional<TenantUserAttributes, 'id' | 'permissions' | 'joined_at'> {}

class TenantUser extends Model<TenantUserAttributes, TenantUserCreationAttributes> implements TenantUserAttributes {
  public id!: number;
  public tenant_id!: number;
  public user_id!: number;
  public role!: 'tenant_owner' | 'tenant_admin' | 'instructor' | 'student';
  public permissions!: string[];
  public joined_at!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Associations
  static associate(models: any) {
    TenantUser.belongsTo(models.Tenant, {
      foreignKey: 'tenant_id',
      as: 'tenant'
    });

    TenantUser.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  }

  static initModel(sequelize: Sequelize): typeof TenantUser {
    TenantUser.init(
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
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        role: {
          type: DataTypes.ENUM('tenant_owner', 'tenant_admin', 'instructor', 'student'),
          allowNull: false,
          defaultValue: 'student'
        },
        permissions: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
          defaultValue: []
        },
        joined_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        }
      },
      {
        sequelize,
        modelName: 'TenantUser',
        tableName: 'tenant_users',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          {
            unique: true,
            fields: ['tenant_id', 'user_id']
          },
          {
            fields: ['tenant_id']
          },
          {
            fields: ['user_id']
          },
          {
            fields: ['role']
          }
        ]
      }
    );

    return TenantUser;
  }

  // Helper methods
  hasPermission(permission: string): boolean {
    return this.permissions.includes(permission);
  }

  isOwner(): boolean {
    return this.role === 'tenant_owner';
  }

  isAdmin(): boolean {
    return this.role === 'tenant_admin' || this.role === 'tenant_owner';
  }

  isInstructor(): boolean {
    return this.role === 'instructor' || this.isAdmin();
  }
}

export default TenantUser;