'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Check if tables exist first, then create only missing ones
    const [results] = await queryInterface.sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('manual_chats', 'ai_generated_quizzes', 'manual_summaries')
    `);

    const existingTables = results.map(r => r.table_name);

    // Create manual_chats table if it doesn't exist
    if (!existingTables.includes('manual_chats')) {
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

      await queryInterface.addIndex('manual_chats', ['manual_id'], { name: 'idx_manual_chats_manual_id' });
      await queryInterface.addIndex('manual_chats', ['user_id'], { name: 'idx_manual_chats_user_id' });
      await queryInterface.addIndex('manual_chats', ['session_id'], { name: 'idx_manual_chats_session_id' });
    }

    // Create ai_generated_quizzes table if it doesn't exist
    if (!existingTables.includes('ai_generated_quizzes')) {
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

      await queryInterface.addIndex('ai_generated_quizzes', ['manual_id'], { name: 'idx_ai_quizzes_manual_id' });
      await queryInterface.addIndex('ai_generated_quizzes', ['user_id'], { name: 'idx_ai_quizzes_user_id' });
      await queryInterface.addIndex('ai_generated_quizzes', ['status'], { name: 'idx_ai_quizzes_status' });
    }

    // Create manual_summaries table if it doesn't exist
    if (!existingTables.includes('manual_summaries')) {
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

      await queryInterface.addIndex('manual_summaries', ['manual_id'], { name: 'idx_manual_summaries_manual_id' });
      await queryInterface.addIndex('manual_summaries', ['user_id'], { name: 'idx_manual_summaries_user_id' });
      await queryInterface.addIndex('manual_summaries', ['summary_type'], { name: 'idx_manual_summaries_type' });
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('manual_summaries');
    await queryInterface.dropTable('ai_generated_quizzes');
    await queryInterface.dropTable('manual_chats');
  }
};
