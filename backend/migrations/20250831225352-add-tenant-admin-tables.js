'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if columns exist before adding them
    const tableInfo = await queryInterface.describeTable('tenants');
    
    if (!tableInfo.domain) {
      await queryInterface.addColumn('tenants', 'domain', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      });
    }

    if (!tableInfo.subdomain) {
      await queryInterface.addColumn('tenants', 'subdomain', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      });
    }

    if (!tableInfo.subscription_plan) {
      await queryInterface.addColumn('tenants', 'subscription_plan', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'free'
      });
    }

    if (!tableInfo.subscription_expires_at) {
      await queryInterface.addColumn('tenants', 'subscription_expires_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    if (!tableInfo.last_active_at) {
      await queryInterface.addColumn('tenants', 'last_active_at', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      });
    }

    // Create tenant_users table
    await queryInterface.createTable('tenant_users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      tenant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tenants',
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
      role: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'member'
      },
      permissions: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      },
      joined_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add unique constraint on tenant_id + user_id
    await queryInterface.addIndex('tenant_users', ['tenant_id', 'user_id'], {
      unique: true,
      name: 'unique_tenant_user'
    });

    // Create tenant_stats table
    await queryInterface.createTable('tenant_stats', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      tenant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      users_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      quizzes_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      sessions_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      videos_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      manuals_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      classrooms_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      storage_used: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0
      },
      ai_credits_used: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      last_updated: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create audit_logs table
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      tenant_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      entity_type: {
        type: Sequelize.STRING,
        allowNull: true
      },
      entity_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      old_values: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      new_values: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('audit_logs', ['user_id']);
    await queryInterface.addIndex('audit_logs', ['tenant_id']);
    await queryInterface.addIndex('audit_logs', ['entity_type', 'entity_id']);
    await queryInterface.addIndex('audit_logs', ['action']);
    await queryInterface.addIndex('audit_logs', ['created_at']);

    // Update existing tenants with default subdomain values
    await queryInterface.sequelize.query(`
      UPDATE tenants 
      SET subdomain = LOWER(REPLACE(name, ' ', '-')) || '-' || id
      WHERE subdomain IS NULL
    `);

    // Set default subscription expiry (30 days from now for free plan)
    await queryInterface.sequelize.query(`
      UPDATE tenants 
      SET subscription_expires_at = CURRENT_TIMESTAMP + INTERVAL '30 days'
      WHERE subscription_plan = 'free' AND subscription_expires_at IS NULL
    `);

    // Create initial tenant_stats records for existing tenants
    await queryInterface.sequelize.query(`
      INSERT INTO tenant_stats (tenant_id, users_count, quizzes_count, videos_count, manuals_count, classrooms_count)
      SELECT 
        t.id,
        (SELECT COUNT(*) FROM users WHERE tenant_id = t.id),
        (SELECT COUNT(*) FROM quizzes WHERE tenant_id = t.id),
        (SELECT COUNT(*) FROM videos WHERE tenant_id = t.id),
        (SELECT COUNT(*) FROM manuals WHERE tenant_id = t.id),
        (SELECT COUNT(*) FROM classrooms WHERE tenant_id = t.id)
      FROM tenants t
      WHERE NOT EXISTS (SELECT 1 FROM tenant_stats WHERE tenant_id = t.id)
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order
    await queryInterface.dropTable('audit_logs').catch(() => {});
    await queryInterface.dropTable('tenant_stats').catch(() => {});
    await queryInterface.dropTable('tenant_users').catch(() => {});

    // Remove columns from tenants table if they exist
    const tableInfo = await queryInterface.describeTable('tenants');
    
    if (tableInfo.subdomain) {
      await queryInterface.removeColumn('tenants', 'subdomain');
    }
    if (tableInfo.subscription_plan) {
      await queryInterface.removeColumn('tenants', 'subscription_plan');
    }
    if (tableInfo.subscription_expires_at) {
      await queryInterface.removeColumn('tenants', 'subscription_expires_at');
    }
    if (tableInfo.last_active_at) {
      await queryInterface.removeColumn('tenants', 'last_active_at');
    }
  }
};