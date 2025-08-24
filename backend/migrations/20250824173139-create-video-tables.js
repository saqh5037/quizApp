'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Enable UUID extension
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // Create video_categories table
    await queryInterface.createTable('video_categories', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      slug: {
        type: Sequelize.STRING(100),
        unique: true
      },
      description: {
        type: Sequelize.TEXT
      },
      icon: {
        type: Sequelize.STRING(50)
      },
      parent_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'video_categories',
          key: 'id'
        }
      },
      order_position: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Create videos table
    await queryInterface.createTable('videos', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        unique: true,
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT
      },
      thumbnail_url: {
        type: Sequelize.TEXT
      },
      duration_seconds: {
        type: Sequelize.INTEGER
      },
      file_size_bytes: {
        type: Sequelize.BIGINT
      },
      original_path: {
        type: Sequelize.STRING(500)
      },
      processed_path: {
        type: Sequelize.STRING(500)
      },
      hls_playlist_url: {
        type: Sequelize.TEXT
      },
      creator_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      organization_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'organizations',
          key: 'id'
        }
      },
      category_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'video_categories',
          key: 'id'
        }
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.TEXT)
      },
      language: {
        type: Sequelize.STRING(10),
        defaultValue: 'es'
      },
      status: {
        type: Sequelize.STRING(50),
        defaultValue: 'draft'
      },
      processing_progress: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      error_message: {
        type: Sequelize.TEXT
      },
      is_public: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      allow_download: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      requires_auth: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      linked_quiz_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'quizzes',
          key: 'id'
        }
      },
      view_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      like_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      average_watch_time: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      completion_rate: {
        type: Sequelize.DECIMAL(5, 2)
      },
      slug: {
        type: Sequelize.STRING(255),
        unique: true
      },
      meta_description: {
        type: Sequelize.TEXT
      },
      meta_keywords: {
        type: Sequelize.ARRAY(Sequelize.TEXT)
      },
      published_at: {
        type: Sequelize.DATE
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      deleted_at: {
        type: Sequelize.DATE
      }
    });

    // Create video_qualities table
    await queryInterface.createTable('video_qualities', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      video_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'videos',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      quality: {
        type: Sequelize.STRING(20)
      },
      width: {
        type: Sequelize.INTEGER
      },
      height: {
        type: Sequelize.INTEGER
      },
      bitrate: {
        type: Sequelize.INTEGER
      },
      file_size_bytes: {
        type: Sequelize.BIGINT
      },
      file_path: {
        type: Sequelize.TEXT
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Create video_chapters table
    await queryInterface.createTable('video_chapters', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      video_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'videos',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT
      },
      start_time_seconds: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      end_time_seconds: {
        type: Sequelize.INTEGER
      },
      thumbnail_url: {
        type: Sequelize.TEXT
      },
      order_position: {
        type: Sequelize.INTEGER
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Create video_transcriptions table
    await queryInterface.createTable('video_transcriptions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      video_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'videos',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      language: {
        type: Sequelize.STRING(10),
        defaultValue: 'es'
      },
      type: {
        type: Sequelize.STRING(50)
      },
      vtt_file_path: {
        type: Sequelize.TEXT
      },
      srt_file_path: {
        type: Sequelize.TEXT
      },
      full_text: {
        type: Sequelize.TEXT
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Create video_progress table
    await queryInterface.createTable('video_progress', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      video_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'videos',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      session_id: {
        type: Sequelize.STRING(255)
      },
      watched_seconds: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      total_watch_time: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      last_position_seconds: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      completed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      completion_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0
      },
      started_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      last_watched_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      completed_at: {
        type: Sequelize.DATE
      }
    });

    // Add unique constraint for user_id and video_id
    await queryInterface.addConstraint('video_progress', {
      fields: ['user_id', 'video_id'],
      type: 'unique',
      name: 'unique_user_video_progress'
    });

    // Create video_notes table
    await queryInterface.createTable('video_notes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      video_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'videos',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      timestamp_seconds: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      note_text: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      is_public: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Create video_bookmarks table
    await queryInterface.createTable('video_bookmarks', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      video_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'videos',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      timestamp_seconds: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(255)
      },
      color: {
        type: Sequelize.STRING(7),
        defaultValue: '#3B82F6'
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Add unique constraint for user_id, video_id, and timestamp_seconds
    await queryInterface.addConstraint('video_bookmarks', {
      fields: ['user_id', 'video_id', 'timestamp_seconds'],
      type: 'unique',
      name: 'unique_user_video_bookmark'
    });

    // Create video_quiz_points table
    await queryInterface.createTable('video_quiz_points', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      video_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'videos',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      quiz_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'quizzes',
          key: 'id'
        }
      },
      question_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'questions',
          key: 'id'
        }
      },
      trigger_time_seconds: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      pause_video: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      mandatory: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Create video_analytics table
    await queryInterface.createTable('video_analytics', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      video_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'videos',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      session_id: {
        type: Sequelize.STRING(255)
      },
      event_type: {
        type: Sequelize.STRING(50)
      },
      timestamp_seconds: {
        type: Sequelize.INTEGER
      },
      additional_data: {
        type: Sequelize.JSONB
      },
      ip_address: {
        type: Sequelize.INET
      },
      user_agent: {
        type: Sequelize.TEXT
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Create video_playlists table
    await queryInterface.createTable('video_playlists', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT
      },
      thumbnail_url: {
        type: Sequelize.TEXT
      },
      creator_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      organization_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'organizations',
          key: 'id'
        }
      },
      is_course: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      is_public: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      total_duration_seconds: {
        type: Sequelize.INTEGER
      },
      video_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      enrolled_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Create playlist_videos table
    await queryInterface.createTable('playlist_videos', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      playlist_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'video_playlists',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      video_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'videos',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      order_position: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      is_required: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Add unique constraint for playlist_id and video_id
    await queryInterface.addConstraint('playlist_videos', {
      fields: ['playlist_id', 'video_id'],
      type: 'unique',
      name: 'unique_playlist_video'
    });

    // Create video_comments table
    await queryInterface.createTable('video_comments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      video_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'videos',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      parent_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'video_comments',
          key: 'id'
        }
      },
      comment_text: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      timestamp_seconds: {
        type: Sequelize.INTEGER
      },
      likes_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      is_pinned: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Create indexes for performance
    await queryInterface.addIndex('videos', ['status']);
    await queryInterface.addIndex('videos', ['creator_id']);
    await queryInterface.addIndex('videos', ['category_id']);
    await queryInterface.addIndex('videos', ['slug']);
    await queryInterface.addIndex('videos', ['organization_id']);
    await queryInterface.addIndex('video_progress', ['user_id']);
    await queryInterface.addIndex('video_progress', ['video_id']);
    await queryInterface.addIndex('video_notes', ['video_id', 'user_id']);
    await queryInterface.addIndex('video_analytics', ['video_id']);
    await queryInterface.addIndex('video_analytics', ['session_id']);
    await queryInterface.addIndex('video_analytics', ['created_at']);

    // Insert default video categories
    await queryInterface.bulkInsert('video_categories', [
      {
        name: 'Capacitación',
        slug: 'capacitacion',
        description: 'Videos de capacitación y entrenamiento',
        icon: 'academic-cap',
        order_position: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Tutoriales',
        slug: 'tutoriales',
        description: 'Tutoriales paso a paso',
        icon: 'light-bulb',
        order_position: 2,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Webinars',
        slug: 'webinars',
        description: 'Webinars y conferencias grabadas',
        icon: 'video-camera',
        order_position: 3,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Documentación',
        slug: 'documentacion',
        description: 'Videos de documentación y guías',
        icon: 'document-text',
        order_position: 4,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Casos de Estudio',
        slug: 'casos-estudio',
        description: 'Análisis de casos reales',
        icon: 'chart-bar',
        order_position: 5,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order due to foreign key constraints
    await queryInterface.dropTable('video_comments');
    await queryInterface.dropTable('playlist_videos');
    await queryInterface.dropTable('video_playlists');
    await queryInterface.dropTable('video_analytics');
    await queryInterface.dropTable('video_quiz_points');
    await queryInterface.dropTable('video_bookmarks');
    await queryInterface.dropTable('video_notes');
    await queryInterface.dropTable('video_progress');
    await queryInterface.dropTable('video_transcriptions');
    await queryInterface.dropTable('video_chapters');
    await queryInterface.dropTable('video_qualities');
    await queryInterface.dropTable('videos');
    await queryInterface.dropTable('video_categories');
  }
};