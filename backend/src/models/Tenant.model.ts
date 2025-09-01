import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

interface TenantAttributes {
  id: number;
  name: string;
  slug: string;
  type: 'internal' | 'client';
  settings: {
    maxUsers?: number;
    maxStorage?: number;
    features?: string[];
    allowPublicQuizzes?: boolean;
    allowVideoUpload?: boolean;
    aiCreditsMonthly?: number;
  };
  branding: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
  };
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface TenantCreationAttributes extends Optional<TenantAttributes, 'id' | 'settings' | 'branding' | 'is_active'> {}

class Tenant extends Model<TenantAttributes, TenantCreationAttributes> implements TenantAttributes {
  public id!: number;
  public name!: string;
  public slug!: string;
  public type!: 'internal' | 'client';
  public settings!: {
    maxUsers?: number;
    maxStorage?: number;
    features?: string[];
    allowPublicQuizzes?: boolean;
    allowVideoUpload?: boolean;
    aiCreditsMonthly?: number;
  };
  public branding!: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
  };
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Associations
  static associate(models: any) {
    Tenant.hasMany(models.User, {
      foreignKey: 'tenant_id',
      as: 'users'
    });

    Tenant.hasMany(models.Classroom, {
      foreignKey: 'tenant_id',
      as: 'classrooms'
    });

    Tenant.hasMany(models.TrainingProgram, {
      foreignKey: 'tenant_id',
      as: 'trainingPrograms'
    });

    Tenant.hasMany(models.Quiz, {
      foreignKey: 'tenant_id',
      as: 'quizzes'
    });

    Tenant.hasMany(models.Certificate, {
      foreignKey: 'tenant_id',
      as: 'certificates'
    });
  }

  static initModel(sequelize: Sequelize): typeof Tenant {
    Tenant.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: true,
            len: [2, 255]
          }
        },
        slug: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true,
          validate: {
            notEmpty: true,
            is: /^[a-z0-9-]+$/i
          }
        },
        type: {
          type: DataTypes.ENUM('internal', 'client'),
          allowNull: false,
          defaultValue: 'client'
        },
        settings: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {}
        },
        branding: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {},
          get() {
            const defaultBranding = {
              primaryColor: '#0066CC',
              secondaryColor: '#00A3FF',
              logo: '/images/default-logo.png'
            };
            const customBranding = this.getDataValue('branding') || {};
            return { ...defaultBranding, ...customBranding };
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
        modelName: 'Tenant',
        tableName: 'tenants',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        hooks: {
          beforeValidate: (tenant: Tenant) => {
            // Auto-generate slug from name if not provided
            if (!tenant.slug && tenant.name) {
              tenant.slug = tenant.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            }
          }
        }
      }
    );

    return Tenant;
  }

  // Helper methods
  isInternal(): boolean {
    return this.type === 'internal';
  }

  isClient(): boolean {
    return this.type === 'client';
  }

  getSetting(key: string, defaultValue: any = null): any {
    return (this.settings as any)[key] || defaultValue;
  }

  getBranding(key: string): any {
    return (this.branding as any)[key];
  }
}

export default Tenant;