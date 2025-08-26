'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Create manual_chats table
    await queryInterface.createTable('manual_chats', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
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
      session_id: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      response: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      role: {
        type: Sequelize.ENUM('user', 'assistant'),
        allowNull: false
      },
      metadata: {
        type: Sequelize.JSON,
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

    // Add indexes for manual_chats
    await queryInterface.addIndex('manual_chats', ['manual_id']);
    await queryInterface.addIndex('manual_chats', ['user_id']);
    await queryInterface.addIndex('manual_chats', ['session_id']);
    await queryInterface.addIndex('manual_chats', ['created_at']);

    // Create ai_generated_quizzes table
    await queryInterface.createTable('ai_generated_quizzes', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
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
      questions: {
        type: Sequelize.JSON,
        allowNull: false
      },
      difficulty: {
        type: Sequelize.ENUM('easy', 'medium', 'hard'),
        allowNull: false,
        defaultValue: 'medium'
      },
      question_count: {
        type: Sequelize.INTEGER,
        allowNull: false
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
      metadata: {
        type: Sequelize.JSON,
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

    // Add indexes for ai_generated_quizzes
    await queryInterface.addIndex('ai_generated_quizzes', ['manual_id']);
    await queryInterface.addIndex('ai_generated_quizzes', ['user_id']);
    await queryInterface.addIndex('ai_generated_quizzes', ['status']);
    await queryInterface.addIndex('ai_generated_quizzes', ['difficulty']);
    await queryInterface.addIndex('ai_generated_quizzes', ['created_at']);

    // Create manual_summaries table
    await queryInterface.createTable('manual_summaries', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
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
      summary_type: {
        type: Sequelize.ENUM('brief', 'detailed', 'key_points'),
        allowNull: false,
        defaultValue: 'brief'
      },
      content: {
        type: Sequelize.TEXT('long'),
        allowNull: false
      },
      word_count: {
        type: Sequelize.INTEGER,
        allowNull: false
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
      metadata: {
        type: Sequelize.JSON,
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

    // Add indexes for manual_summaries
    await queryInterface.addIndex('manual_summaries', ['manual_id']);
    await queryInterface.addIndex('manual_summaries', ['user_id']);
    await queryInterface.addIndex('manual_summaries', ['summary_type']);
    await queryInterface.addIndex('manual_summaries', ['status']);
    await queryInterface.addIndex('manual_summaries', ['created_at']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('manual_summaries');
    await queryInterface.dropTable('ai_generated_quizzes');
    await queryInterface.dropTable('manual_chats');
  }
};
