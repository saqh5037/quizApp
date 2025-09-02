'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('tenants', 'subscription_plan', {
      type: Sequelize.ENUM('free', 'basic', 'premium', 'enterprise'),
      allowNull: false,
      defaultValue: 'free'
    });

    await queryInterface.addColumn('tenants', 'subscription_expires_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('tenants', 'last_active_at', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: Sequelize.NOW
    });

    await queryInterface.addColumn('tenants', 'domain', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn('tenants', 'subdomain', {
      type: Sequelize.STRING(100),
      allowNull: true,
      unique: true
    });

    // Update existing tenants to have default values
    await queryInterface.sequelize.query(`
      UPDATE tenants 
      SET 
        subscription_plan = 'free',
        last_active_at = CURRENT_TIMESTAMP,
        subdomain = LOWER(REPLACE(name, ' ', '-'))
      WHERE subscription_plan IS NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('tenants', 'subscription_plan');
    await queryInterface.removeColumn('tenants', 'subscription_expires_at');
    await queryInterface.removeColumn('tenants', 'last_active_at');
    await queryInterface.removeColumn('tenants', 'domain');
    await queryInterface.removeColumn('tenants', 'subdomain');
    
    // Remove the enum type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_tenants_subscription_plan"');
  }
};