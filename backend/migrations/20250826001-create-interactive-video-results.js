'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create table for storing interactive video results from public access
    await queryInterface.createTable('public_interactive_video_results', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      video_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'videos',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      layer_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'interactive_video_layers',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      student_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      student_email: {
        type: Sequelize.STRING,
        allowNull: false
      },
      student_phone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      score: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0
      },
      total_questions: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      correct_answers: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      passed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      passing_score: {
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 70
      },
      answers: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      },
      duration_seconds: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      ip_address: {
        type: Sequelize.STRING,
        allowNull: true
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
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

    // Add indexes for better query performance
    await queryInterface.addIndex('public_interactive_video_results', ['video_id']);
    await queryInterface.addIndex('public_interactive_video_results', ['student_email']);
    await queryInterface.addIndex('public_interactive_video_results', ['completed_at']);
    await queryInterface.addIndex('public_interactive_video_results', ['passed']);

    // Create table for video completions (non-interactive)
    await queryInterface.createTable('public_video_completions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      video_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'videos',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      student_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      student_email: {
        type: Sequelize.STRING,
        allowNull: false
      },
      student_phone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      watch_duration_seconds: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      completed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      ip_address: {
        type: Sequelize.STRING,
        allowNull: true
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('public_video_completions', ['video_id']);
    await queryInterface.addIndex('public_video_completions', ['student_email']);
    await queryInterface.addIndex('public_video_completions', ['completed_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('public_video_completions');
    await queryInterface.dropTable('public_interactive_video_results');
  }
};