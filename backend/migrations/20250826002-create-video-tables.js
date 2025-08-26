'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if tables exist before creating
    const tables = await queryInterface.showAllTables();
    
    // Create videos table if not exists
    if (!tables.includes('videos')) {
      await queryInterface.createTable('videos', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        uuid: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          unique: true,
          allowNull: false
        },
        title: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        thumbnail_url: {
          type: Sequelize.STRING(500),
          allowNull: true
        },
        duration_seconds: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        file_size_bytes: {
          type: Sequelize.BIGINT,
          allowNull: true
        },
        original_path: {
          type: Sequelize.STRING(500),
          allowNull: true
        },
        processed_path: {
          type: Sequelize.STRING(500),
          allowNull: true
        },
        hls_playlist_url: {
          type: Sequelize.STRING(500),
          allowNull: true
        },
        stream_url: {
          type: Sequelize.STRING(500),
          allowNull: true
        },
        file_path: {
          type: Sequelize.STRING(500),
          allowNull: true
        },
        storage_provider: {
          type: Sequelize.ENUM('local', 'minio', 's3'),
          defaultValue: 'minio'
        },
        creator_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          }
        },
        organization_id: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        category_id: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        tenant_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'tenants',
            key: 'id'
          }
        },
        tags: {
          type: Sequelize.ARRAY(Sequelize.STRING),
          defaultValue: []
        },
        language: {
          type: Sequelize.STRING(10),
          defaultValue: 'es'
        },
        status: {
          type: Sequelize.ENUM('pending', 'processing', 'ready', 'error'),
          defaultValue: 'pending'
        },
        processing_progress: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        error_message: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        is_public: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        allow_download: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        requires_auth: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        linked_quiz_id: {
          type: Sequelize.INTEGER,
          allowNull: true
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
          type: Sequelize.FLOAT,
          allowNull: true
        },
        completion_rate: {
          type: Sequelize.FLOAT,
          allowNull: true
        },
        slug: {
          type: Sequelize.STRING(255),
          unique: true,
          allowNull: true
        },
        meta_description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        meta_keywords: {
          type: Sequelize.ARRAY(Sequelize.STRING),
          defaultValue: []
        },
        published_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false
        }
      });
      
      // Add indexes
      await queryInterface.addIndex('videos', ['uuid']);
      await queryInterface.addIndex('videos', ['status']);
      await queryInterface.addIndex('videos', ['creator_id']);
      await queryInterface.addIndex('videos', ['category_id']);
      await queryInterface.addIndex('videos', ['tenant_id']);
      await queryInterface.addIndex('videos', ['is_public']);
      await queryInterface.addIndex('videos', ['slug']);
      await queryInterface.addIndex('videos', ['published_at']);
    }
    
    // Create video_categories table if not exists
    if (!tables.includes('video_categories')) {
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
          allowNull: false,
          unique: true
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        icon: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        parent_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
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
          allowNull: false
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false
        }
      });
    }
    
    // Create other stub tables
    const stubTables = [
      'video_qualities',
      'video_chapters', 
      'video_transcriptions',
      'video_progresses',
      'video_notes',
      'video_bookmarks',
      'video_comments',
      'video_analytics',
      'video_quiz_points',
      'video_playlists',
      'playlist_videos'
    ];
    
    for (const tableName of stubTables) {
      if (!tables.includes(tableName)) {
        await queryInterface.createTable(tableName, {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false
          }
        });
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order
    const tablesToDrop = [
      'playlist_videos',
      'video_playlists',
      'video_quiz_points',
      'video_analytics',
      'video_comments',
      'video_bookmarks',
      'video_notes',
      'video_progresses',
      'video_transcriptions',
      'video_chapters',
      'video_qualities',
      'video_categories',
      'videos'
    ];
    
    for (const tableName of tablesToDrop) {
      try {
        await queryInterface.dropTable(tableName);
      } catch (error) {
        // Table might not exist
      }
    }
  }
};