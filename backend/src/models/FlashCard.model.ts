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

class FlashCard extends Model<
  InferAttributes<FlashCard>,
  InferCreationAttributes<FlashCard>
> {
  declare id: CreationOptional<number>;
  declare manual_id: ForeignKey<Manual['id']>;
  declare user_id: ForeignKey<User['id']>;
  declare set_title: string;
  declare set_description: CreationOptional<string | null>;
  declare cards: any[]; // Array of {front: string, back: string, category?: string, difficulty?: string}
  declare total_cards: number;
  declare category: CreationOptional<string | null>;
  declare difficulty_level: 'easy' | 'medium' | 'hard';
  declare tags: string[]; // Array of tags for categorization
  declare is_public: CreationOptional<boolean>;
  declare study_stats: CreationOptional<any>; // Statistics like times studied, success rate, etc.
  declare status: CreationOptional<'generating' | 'ready' | 'failed'>;
  declare metadata: CreationOptional<any>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Associations
  declare manual?: NonAttribute<Manual>;
  declare user?: NonAttribute<User>;

  declare static associations: {
    manual: Association<FlashCard, Manual>;
    user: Association<FlashCard, User>;
  };
}

FlashCard.init(
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
    set_title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    set_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    cards: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      validate: {
        isArrayOfCards(value: any) {
          if (!Array.isArray(value)) {
            throw new Error('Cards must be an array');
          }
          for (const card of value) {
            if (!card.front || !card.back) {
              throw new Error('Each card must have front and back properties');
            }
          }
        }
      }
    },
    total_cards: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 1000
      }
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    difficulty_level: {
      type: DataTypes.ENUM('easy', 'medium', 'hard'),
      allowNull: false,
      defaultValue: 'medium'
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    study_stats: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        times_studied: 0,
        total_reviews: 0,
        correct_answers: 0,
        last_studied: null
      },
    },
    status: {
      type: DataTypes.ENUM('generating', 'ready', 'failed'),
      defaultValue: 'generating',
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
    tableName: 'flash_cards',
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
        fields: ['difficulty_level']
      },
      {
        fields: ['category']
      },
      {
        fields: ['is_public']
      },
      {
        fields: ['status']
      },
      {
        fields: ['created_at']
      }
    ],
  }
);

export default FlashCard;