import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment';

// User role enum matching PostgreSQL
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student',
  GUEST = 'guest',
}

// User attributes interface
export interface UserAttributes {
  id: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string;
  organizationId?: number;
  tenant_id?: number; // Multi-tenant support
  isActive: boolean;
  isVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  lastLoginAt?: Date;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

// Creation attributes
export interface UserCreationAttributes extends Optional<
  UserAttributes, 
  'id' | 'role' | 'isActive' | 'isVerified' | 'metadata'
> {}

// User model class
class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public email!: string;
  public password!: string;
  public firstName!: string;
  public lastName!: string;
  public role!: UserRole;
  public avatarUrl?: string;
  public organizationId?: number;
  public tenant_id?: number; // Multi-tenant support
  public isActive!: boolean;
  public isVerified!: boolean;
  public verificationToken?: string;
  public resetPasswordToken?: string;
  public resetPasswordExpires?: Date;
  public lastLoginAt?: Date;
  public metadata?: Record<string, any>;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;

  // Virtual fields
  public get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  public get displayName(): string {
    return this.fullName || this.email;
  }

  public get isAdmin(): boolean {
    return this.role === UserRole.ADMIN || this.role === UserRole.SUPER_ADMIN;
  }

  public get isTeacher(): boolean {
    return this.role === UserRole.TEACHER || this.isAdmin;
  }

  // Instance methods
  public async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  public async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  public generateVerificationToken(): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.verificationToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    return token;
  }

  public generatePasswordResetToken(): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    this.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    return token;
  }

  public generateJWT(): string {
    return jwt.sign(
      {
        id: this.id,
        email: this.email,
        role: this.role,
        organizationId: this.organizationId,
        tenant_id: this.tenant_id, // Include tenant_id in token
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );
  }

  public generateRefreshToken(): string {
    const token = jwt.sign(
      {
        id: this.id,
        tokenVersion: 1,
      },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
    );
    // Store refresh token in metadata or handle separately
    // this.refreshToken = token;
    return token;
  }

  public async updateLastLogin(): Promise<void> {
    this.lastLoginAt = new Date();
    await this.save();
  }

  public canAccessOrganization(organizationId: number): boolean {
    if (this.role === UserRole.SUPER_ADMIN) return true;
    return this.organizationId === organizationId;
  }

  public hasPermission(permission: string): boolean {
    const permissions: Record<UserRole, string[]> = {
      [UserRole.SUPER_ADMIN]: ['*'],
      [UserRole.ADMIN]: [
        'quiz.create', 'quiz.edit', 'quiz.delete',
        'session.create', 'session.manage',
        'report.view', 'report.export',
        'user.view', 'user.edit',
      ],
      [UserRole.TEACHER]: [
        'quiz.create', 'quiz.edit', 'quiz.delete.own',
        'session.create', 'session.manage.own',
        'report.view.own', 'report.export.own',
      ],
      [UserRole.STUDENT]: [
        'quiz.participate',
        'session.join',
        'report.view.own',
      ],
      [UserRole.GUEST]: [
        'session.join',
      ],
    };

    const userPermissions = permissions[this.role] || [];
    return userPermissions.includes('*') || userPermissions.includes(permission);
  }

  public getMetadata(): Record<string, any> {
    const defaultMetadata = {
      preferences: {
        theme: 'light',
        language: 'en',
        notifications: {
          email: true,
          push: false,
        },
      },
      stats: {
        quizzesCreated: 0,
        sessionsHosted: 0,
        quizzesParticipated: 0,
      },
    };

    return { ...defaultMetadata, ...(this.metadata || {}) };
  }

  public async updateMetadata(path: string, value: any): Promise<void> {
    const metadata = this.getMetadata();
    const keys = path.split('.');
    let current = metadata;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    
    await this.update({ metadata });
  }

  // Override toJSON to exclude sensitive fields
  public toJSON() {
    const values = { ...this.get() };
    delete values.password;
    // delete values.refreshToken;
    delete values.verificationToken;
    delete values.resetPasswordToken;
    delete values.resetPasswordExpires;
    return values;
  }
}

// Initialize the model
User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: {
        name: 'unique_user_email',
        msg: 'This email is already registered',
      },
      validate: {
        isEmail: {
          msg: 'Please provide a valid email address',
        },
        notEmpty: {
          msg: 'Email is required',
        },
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: {
          args: [6, 255],
          msg: 'Password must be at least 6 characters long',
        },
      },
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'first_name',
      validate: {
        len: {
          args: [1, 100],
          msg: 'First name must be between 1 and 100 characters',
        },
      },
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'last_name',
      validate: {
        len: {
          args: [1, 100],
          msg: 'Last name must be between 1 and 100 characters',
        },
      },
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      defaultValue: UserRole.STUDENT,
      allowNull: false,
      validate: {
        isIn: {
          args: [Object.values(UserRole)],
          msg: 'Invalid user role',
        },
      },
    },
    avatarUrl: {
      type: DataTypes.TEXT,
      field: 'avatar_url',
      validate: {
        isUrl: {
          msg: 'Avatar URL must be a valid URL',
        },
      },
    },
    organizationId: {
      type: DataTypes.INTEGER,
      field: 'organization_id',
      references: {
        model: 'organizations',
        key: 'id',
      },
    },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'id',
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: 'is_active',
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      field: 'is_verified',
    },
    verificationToken: {
      type: DataTypes.STRING(255),
      field: 'verification_token',
    },
    resetPasswordToken: {
      type: DataTypes.STRING(255),
      field: 'reset_password_token',
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      field: 'reset_password_expires',
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      field: 'last_login_at',
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      validate: {
        isValidJSON(value: any) {
          try {
            if (value && typeof value === 'object') {
              JSON.stringify(value);
            }
          } catch (error) {
            throw new Error('Metadata must be valid JSON');
          }
        },
      },
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    paranoid: false, // Disable soft deletes for SQLite
    underscored: true,
    hooks: {
      beforeCreate: async (user: User) => {
        if (user.password) {
          user.password = await user.hashPassword(user.password);
        }
        // Generate avatar if not provided
        if (!user.avatarUrl) {
          const firstName = user.firstName || 'U';
          const lastName = user.lastName || 'U';
          const initials = `${firstName[0]}${lastName[0]}`.toUpperCase();
          user.avatarUrl = `https://ui-avatars.com/api/?name=${initials}&background=03A9F4&color=fff`;
        }
      },
      beforeUpdate: async (user: User) => {
        if (user.changed('password')) {
          user.password = await user.hashPassword(user.password);
        }
      },
      beforeBulkCreate: async (users: User[]) => {
        for (const user of users) {
          if (user.password) {
            user.password = await user.hashPassword(user.password);
          }
        }
      },
    },
    defaultScope: {
      attributes: { exclude: ['password', 'verificationToken', 'resetPasswordToken'] },
    },
    scopes: {
      withPassword: {
        attributes: { include: ['password'] },
      },
      withTokens: {
        attributes: { include: ['verificationToken', 'resetPasswordToken'] },
      },
      active: {
        where: {
          isActive: true,
          isVerified: true,
        },
      },
      byOrganization: (organizationId: number) => ({
        where: {
          organizationId,
        },
      }),
      byRole: (role: UserRole) => ({
        where: {
          role,
        },
      }),
    },
    indexes: [
      {
        fields: ['email'],
        unique: true,
      },
      {
        fields: ['organization_id'],
      },
      {
        fields: ['role'],
      },
      {
        fields: ['is_active'],
      },
    ],
  }
);

export default User;