'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create interactive_video_layers table
    await queryInterface.createTable('interactive_video_layers', {
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
      is_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      ai_generated_content: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      ai_model_used: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      confidence_score: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true
      },
      auto_pause: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      require_answers: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      passing_score: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 70.00
      },
      max_attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 3
      },
      processing_status: {
        type: Sequelize.ENUM('pending', 'processing', 'ready', 'error'),
        defaultValue: 'pending'
      },
      processing_log: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      tenant_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        }
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

    // Add indexes to interactive_video_layers
    await queryInterface.addIndex('interactive_video_layers', ['video_id']);
    await queryInterface.addIndex('interactive_video_layers', ['processing_status']);
    await queryInterface.addIndex('interactive_video_layers', ['tenant_id']);

    // Create interactive_video_results table
    await queryInterface.createTable('interactive_video_results', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      interactive_layer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'interactive_video_layers',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      session_id: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      total_questions: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      correct_answers: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      final_score: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      completion_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      watch_time_seconds: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      total_pauses: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      detailed_responses: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      },
      key_moments_completed: {
        type: Sequelize.ARRAY(Sequelize.INTEGER),
        allowNull: true,
        defaultValue: []
      },
      status: {
        type: Sequelize.ENUM('in_progress', 'completed', 'abandoned'),
        defaultValue: 'in_progress'
      },
      started_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      certificate_earned: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      certificate_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'certificates',
          key: 'id'
        }
      },
      tenant_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        }
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

    // Add indexes to interactive_video_results
    await queryInterface.addIndex('interactive_video_results', 
      ['interactive_layer_id', 'user_id', 'session_id'], 
      { unique: true }
    );
    await queryInterface.addIndex('interactive_video_results', ['user_id']);
    await queryInterface.addIndex('interactive_video_results', ['session_id']);
    await queryInterface.addIndex('interactive_video_results', ['status']);
    await queryInterface.addIndex('interactive_video_results', ['tenant_id']);

    // Create interactive_video_answers table
    await queryInterface.createTable('interactive_video_answers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      result_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'interactive_video_results',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      moment_id: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      question_text: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      user_answer: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      correct_answer: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_correct: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      response_time_seconds: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      attempt_number: {
        type: Sequelize.INTEGER,
        defaultValue: 1
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

    // Add indexes to interactive_video_answers
    await queryInterface.addIndex('interactive_video_answers', ['result_id']);
    await queryInterface.addIndex('interactive_video_answers', ['moment_id']);
    await queryInterface.addIndex('interactive_video_answers', ['is_correct']);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order due to foreign key constraints
    await queryInterface.dropTable('interactive_video_answers');
    await queryInterface.dropTable('interactive_video_results');
    await queryInterface.dropTable('interactive_video_layers');
  }
};