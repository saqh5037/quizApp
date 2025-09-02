'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Add tenant_id to participants table
      await queryInterface.addColumn(
        'participants',
        'tenant_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true, // Initially nullable for migration
          references: {
            model: 'tenants',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        { transaction }
      );

      // Add tenant_id to answers table
      await queryInterface.addColumn(
        'answers',
        'tenant_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true, // Initially nullable for migration
          references: {
            model: 'tenants',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        { transaction }
      );

      // Add tenant_id to manual_chats table
      await queryInterface.addColumn(
        'manual_chats',
        'tenant_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true, // Initially nullable for migration
          references: {
            model: 'tenants',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        { transaction }
      );

      // Add tenant_id to manual_summaries table
      await queryInterface.addColumn(
        'manual_summaries',
        'tenant_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true, // Initially nullable for migration
          references: {
            model: 'tenants',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        { transaction }
      );

      // Add tenant_id to ai_generated_quizzes table
      await queryInterface.addColumn(
        'ai_generated_quizzes',
        'tenant_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true, // Initially nullable for migration
          references: {
            model: 'tenants',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        { transaction }
      );

      console.log('✅ Added tenant_id columns to critical tables');

      // Now populate the tenant_id values based on relationships
      
      // Update participants tenant_id from quiz_sessions -> users
      await queryInterface.sequelize.query(`
        UPDATE participants 
        SET tenant_id = (
          SELECT u.tenant_id 
          FROM quiz_sessions qs 
          JOIN users u ON qs.host_id = u.id 
          WHERE qs.id = participants.session_id
        )
        WHERE tenant_id IS NULL
      `, { transaction });

      // Update answers tenant_id from quiz_sessions -> users  
      await queryInterface.sequelize.query(`
        UPDATE answers 
        SET tenant_id = (
          SELECT u.tenant_id 
          FROM quiz_sessions qs 
          JOIN users u ON qs.host_id = u.id 
          WHERE qs.id = answers.session_id
        )
        WHERE tenant_id IS NULL
      `, { transaction });

      // Update manual_chats tenant_id from manuals
      await queryInterface.sequelize.query(`
        UPDATE manual_chats 
        SET tenant_id = (
          SELECT m.tenant_id 
          FROM manuals m 
          WHERE m.id = manual_chats.manual_id
        )
        WHERE tenant_id IS NULL
      `, { transaction });

      // Update manual_summaries tenant_id from manuals
      await queryInterface.sequelize.query(`
        UPDATE manual_summaries 
        SET tenant_id = (
          SELECT m.tenant_id 
          FROM manuals m 
          WHERE m.id = manual_summaries.manual_id
        )
        WHERE tenant_id IS NULL
      `, { transaction });

      // Update ai_generated_quizzes tenant_id from manuals
      await queryInterface.sequelize.query(`
        UPDATE ai_generated_quizzes 
        SET tenant_id = (
          SELECT m.tenant_id 
          FROM manuals m 
          WHERE m.id = ai_generated_quizzes.manual_id
        )
        WHERE tenant_id IS NULL
      `, { transaction });

      console.log('✅ Populated tenant_id values from relationships');

      // Add indexes for performance
      await queryInterface.addIndex('participants', ['tenant_id'], { transaction });
      await queryInterface.addIndex('answers', ['tenant_id'], { transaction });
      await queryInterface.addIndex('manual_chats', ['tenant_id'], { transaction });
      await queryInterface.addIndex('manual_summaries', ['tenant_id'], { transaction });
      await queryInterface.addIndex('ai_generated_quizzes', ['tenant_id'], { transaction });

      console.log('✅ Added indexes for tenant_id columns');

      // Now make the columns NOT NULL after populating data
      await queryInterface.changeColumn(
        'participants',
        'tenant_id',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'tenants',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        { transaction }
      );

      await queryInterface.changeColumn(
        'answers',
        'tenant_id',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'tenants',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        { transaction }
      );

      await queryInterface.changeColumn(
        'manual_chats',
        'tenant_id',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'tenants',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        { transaction }
      );

      await queryInterface.changeColumn(
        'manual_summaries',
        'tenant_id',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'tenants',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        { transaction }
      );

      await queryInterface.changeColumn(
        'ai_generated_quizzes',
        'tenant_id',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'tenants',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        { transaction }
      );

      console.log('✅ Made tenant_id columns NOT NULL');

      await transaction.commit();
      console.log('🎉 Critical multi-tenant migration completed successfully!');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove indexes first
      await queryInterface.removeIndex('participants', ['tenant_id'], { transaction });
      await queryInterface.removeIndex('answers', ['tenant_id'], { transaction });
      await queryInterface.removeIndex('manual_chats', ['tenant_id'], { transaction });
      await queryInterface.removeIndex('manual_summaries', ['tenant_id'], { transaction });
      await queryInterface.removeIndex('ai_generated_quizzes', ['tenant_id'], { transaction });

      // Remove columns
      await queryInterface.removeColumn('participants', 'tenant_id', { transaction });
      await queryInterface.removeColumn('answers', 'tenant_id', { transaction });
      await queryInterface.removeColumn('manual_chats', 'tenant_id', { transaction });
      await queryInterface.removeColumn('manual_summaries', 'tenant_id', { transaction });
      await queryInterface.removeColumn('ai_generated_quizzes', 'tenant_id', { transaction });

      await transaction.commit();
      console.log('✅ Rollback completed');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};