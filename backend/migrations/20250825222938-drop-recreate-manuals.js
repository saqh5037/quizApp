'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Drop the existing table if it exists
    await queryInterface.dropTable('manuals', { cascade: true, force: true });

    // Recreate the table with all columns
    await queryInterface.createTable('manuals', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
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
      file_path: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('processing', 'ready', 'failed'),
        defaultValue: 'processing',
        allowNull: false
      },
      is_public: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      extracted_text: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
      },
      page_count: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      tenant_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
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
    try {
      await queryInterface.addIndex('manuals', ['user_id']);
      await queryInterface.addIndex('manuals', ['status']);
      await queryInterface.addIndex('manuals', ['is_public']);
      await queryInterface.addIndex('manuals', ['tenant_id']);
    } catch (err) {
      console.log('Index creation warning:', err.message);
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('manuals');
  }
};
