'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create study_guides table
    await queryInterface.createTable('study_guides', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      manual_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'manuals',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      content: {
        type: Sequelize.TEXT('long'),
        allowNull: false,
      },
      difficulty_level: {
        type: Sequelize.ENUM('beginner', 'intermediate', 'advanced'),
        allowNull: false,
        defaultValue: 'beginner'
      },
      estimated_time: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      topics: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
      },
      learning_objectives: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
      },
      is_public: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: Sequelize.ENUM('generating', 'ready', 'failed'),
        defaultValue: 'generating',
        allowNull: false,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create flash_cards table
    await queryInterface.createTable('flash_cards', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      manual_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'manuals',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      set_title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      set_description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      cards: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
      },
      total_cards: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      difficulty_level: {
        type: Sequelize.ENUM('easy', 'medium', 'hard'),
        allowNull: false,
        defaultValue: 'medium'
      },
      tags: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
      },
      is_public: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      study_stats: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {
          times_studied: 0,
          total_reviews: 0,
          correct_answers: 0,
          last_studied: null
        },
      },
      status: {
        type: Sequelize.ENUM('generating', 'ready', 'failed'),
        defaultValue: 'generating',
        allowNull: false,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create indexes for study_guides
    await queryInterface.addIndex('study_guides', ['manual_id']);
    await queryInterface.addIndex('study_guides', ['user_id']);
    await queryInterface.addIndex('study_guides', ['difficulty_level']);
    await queryInterface.addIndex('study_guides', ['is_public']);
    await queryInterface.addIndex('study_guides', ['status']);
    await queryInterface.addIndex('study_guides', ['created_at']);

    // Create indexes for flash_cards
    await queryInterface.addIndex('flash_cards', ['manual_id']);
    await queryInterface.addIndex('flash_cards', ['user_id']);
    await queryInterface.addIndex('flash_cards', ['difficulty_level']);
    await queryInterface.addIndex('flash_cards', ['is_public']);
    await queryInterface.addIndex('flash_cards', ['status']);
    await queryInterface.addIndex('flash_cards', ['created_at']);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop flash_cards table
    await queryInterface.dropTable('flash_cards');
    
    // Drop study_guides table
    await queryInterface.dropTable('study_guides');
  }
};