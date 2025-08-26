import { 
  Model, 
  DataTypes, 
  InferAttributes, 
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
  NonAttribute,
  Association
} from 'sequelize';
import { sequelize } from '../config/database';
import User from './User.model';

class Manual extends Model<
  InferAttributes<Manual>,
  InferCreationAttributes<Manual>
> {
  declare id: CreationOptional<number>;
  declare title: string;
  declare description: CreationOptional<string | null>;
  declare file_path: string;
  declare file_size: number;
  declare mime_type: string;
  declare status: CreationOptional<'processing' | 'ready' | 'failed'>;
  declare is_public: CreationOptional<boolean>;
  declare extracted_text: CreationOptional<string | null>;
  declare metadata: CreationOptional<any>;
  declare page_count: CreationOptional<number | null>;
  declare user_id: ForeignKey<User['id']>;
  declare tenant_id: CreationOptional<number>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Associations
  declare creator?: NonAttribute<User>;

  declare static associations: {
    creator: Association<Manual, User>;
  };

  // Instance methods
  async markAsReady() {
    this.status = 'ready';
    await this.save();
  }

  async markAsFailed(error?: string) {
    this.status = 'failed';
    if (error) {
      this.metadata = { ...this.metadata, error };
    }
    await this.save();
  }
}

Manual.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    file_path: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 52428800 // 50MB
      }
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        isIn: [['application/pdf', 'text/plain']]
      }
    },
    status: {
      type: DataTypes.ENUM('processing', 'ready', 'failed'),
      defaultValue: 'processing',
      allowNull: false,
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    extracted_text: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },
    page_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      }
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
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
    tableName: 'manuals',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['is_public']
      },
      {
        fields: ['tenant_id']
      }
    ],
  }
);

export default Manual;