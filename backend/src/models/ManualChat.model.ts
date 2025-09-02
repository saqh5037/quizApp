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
import Manual from './Manual.model';
import User from './User.model';

class ManualChat extends Model<
  InferAttributes<ManualChat>,
  InferCreationAttributes<ManualChat>
> {
  declare id: CreationOptional<number>;
  declare manual_id: ForeignKey<Manual['id']>;
  declare user_id: ForeignKey<User['id']>;
  declare tenant_id: number; // Multi-tenant support
  declare session_id: string;
  declare message: string;
  declare response: string;
  declare role: 'user' | 'assistant';
  declare metadata: CreationOptional<any>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Associations
  declare manual?: NonAttribute<Manual>;
  declare user?: NonAttribute<User>;

  declare static associations: {
    manual: Association<ManualChat, Manual>;
    user: Association<ManualChat, User>;
  };
}

ManualChat.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    manual_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'manuals',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
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
      allowNull: false,
      references: {
        model: 'tenants',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    session_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    response: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    role: {
      type: DataTypes.ENUM('user', 'assistant'),
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
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
    tableName: 'manual_chats',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['manual_id']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['session_id']
      },
      {
        fields: ['created_at']
      }
    ],
  }
);

export default ManualChat;