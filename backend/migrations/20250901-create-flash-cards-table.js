'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if table already exists
    const tableExists = await queryInterface.sequelize.query(
      "SELECT to_regclass('public.flash_cards') IS NOT NULL AS exists",
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    if (tableExists[0].exists) {
      console.log('Table flash_cards already exists, skipping creation');
      return;
    }
    
    await queryInterface.createTable('flash_cards', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      manual_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'manuals',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      set_title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      total_cards: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 20
      },
      difficulty_level: {
        type: Sequelize.ENUM('easy', 'medium', 'hard', 'mixed'),
        allowNull: false,
        defaultValue: 'medium'
      },
      categories: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      },
      cards: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of flash cards with front and back content'
      },
      status: {
        type: Sequelize.ENUM('generating', 'ready', 'failed'),
        allowNull: false,
        defaultValue: 'generating'
      },
      generation_prompt: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_public: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('flash_cards', ['manual_id']);
    await queryInterface.addIndex('flash_cards', ['user_id']);
    await queryInterface.addIndex('flash_cards', ['status']);
    await queryInterface.addIndex('flash_cards', ['is_public']);
    await queryInterface.addIndex('flash_cards', ['created_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('flash_cards');
  }
};