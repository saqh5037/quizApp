'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if table already exists
    const tableExists = await queryInterface.sequelize.query(
      "SELECT to_regclass('public.study_guides') IS NOT NULL AS exists",
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    if (tableExists[0].exists) {
      console.log('Table study_guides already exists, skipping creation');
      return;
    }
    
    await queryInterface.createTable('study_guides', {
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
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      difficulty_level: {
        type: Sequelize.ENUM('beginner', 'intermediate', 'advanced'),
        allowNull: false,
        defaultValue: 'beginner'
      },
      estimated_time: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 60,
        comment: 'Estimated time in minutes'
      },
      learning_objectives: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      },
      topics: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
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
    await queryInterface.addIndex('study_guides', ['manual_id']);
    await queryInterface.addIndex('study_guides', ['user_id']);
    await queryInterface.addIndex('study_guides', ['status']);
    await queryInterface.addIndex('study_guides', ['is_public']);
    await queryInterface.addIndex('study_guides', ['created_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('study_guides');
  }
};