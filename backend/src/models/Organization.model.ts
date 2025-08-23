import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// Organization attributes interface
export interface OrganizationAttributes {
  id: number;
  name: string;
  slug: string;
  logoUrl?: string;
  settings?: Record<string, any>;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Creation attributes (id is optional for creation)
export interface OrganizationCreationAttributes extends Optional<OrganizationAttributes, 'id' | 'isActive' | 'settings'> {}

// Organization model class
class Organization extends Model<OrganizationAttributes, OrganizationCreationAttributes> implements OrganizationAttributes {
  public id!: number;
  public name!: string;
  public slug!: string;
  public logoUrl?: string;
  public settings?: Record<string, any>;
  public isActive!: boolean;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance methods
  public async generateUniqueSlug(): Promise<string> {
    const baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    let slug = baseSlug;
    let counter = 1;
    
    while (await Organization.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    return slug;
  }

  // Get organization settings with defaults
  public getSettings(): Record<string, any> {
    const defaultSettings = {
      maxUsers: 100,
      maxQuizzes: 50,
      maxSessionsPerMonth: 100,
      features: {
        advancedReporting: false,
        customBranding: false,
        ssoEnabled: false,
        apiAccess: false,
      },
      branding: {
        primaryColor: '#03A9F4',
        logoUrl: this.logoUrl,
      },
    };

    return { ...defaultSettings, ...(this.settings || {}) };
  }

  // Update specific setting
  public async updateSetting(path: string, value: any): Promise<void> {
    const settings = this.getSettings();
    const keys = path.split('.');
    let current = settings;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    
    await this.update({ settings });
  }
}

// Initialize the model
Organization.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Organization name is required',
        },
        len: {
          args: [2, 255],
          msg: 'Organization name must be between 2 and 255 characters',
        },
      },
    },
    slug: {
      type: DataTypes.STRING(100),
      unique: {
        name: 'unique_organization_slug',
        msg: 'This organization slug already exists',
      },
      allowNull: false,
      validate: {
        is: {
          args: /^[a-z0-9-]+$/,
          msg: 'Slug can only contain lowercase letters, numbers, and hyphens',
        },
      },
    },
    logoUrl: {
      type: DataTypes.TEXT,
      field: 'logo_url',
      validate: {
        isUrl: {
          msg: 'Logo URL must be a valid URL',
        },
      },
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {},
      validate: {
        isValidJSON(value: any) {
          try {
            if (value && typeof value === 'object') {
              JSON.stringify(value);
            }
          } catch (error) {
            throw new Error('Settings must be valid JSON');
          }
        },
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: 'is_active',
    },
  },
  {
    sequelize,
    modelName: 'Organization',
    tableName: 'organizations',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeValidate: async (organization: Organization) => {
        // Auto-generate slug if not provided
        if (!organization.slug && organization.name) {
          organization.slug = await organization.generateUniqueSlug();
        }
      },
      beforeUpdate: async (organization: Organization) => {
        // Prevent slug changes after creation
        if (organization.changed('slug') && !organization.isNewRecord) {
          throw new Error('Organization slug cannot be changed');
        }
      },
    },
    indexes: [
      {
        fields: ['slug'],
        unique: true,
      },
      {
        fields: ['is_active'],
      },
      {
        fields: ['created_at'],
      },
    ],
    scopes: {
      active: {
        where: {
          isActive: true,
        },
      },
    },
  }
);

export default Organization;