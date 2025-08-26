const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('aristotest', 'postgres', 'postgres', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false
});

async function checkTenant() {
  try {
    // Check tenants
    const [tenants] = await sequelize.query('SELECT * FROM tenants');
    console.log('Tenants:', tenants);
    
    // Check admin user
    const [users] = await sequelize.query("SELECT id, email, role, tenant_id FROM users WHERE email = 'admin@aristotest.com'");
    console.log('Admin user:', users[0]);
    
    // Update tenant to be active if it's not
    if (tenants.length > 0 && !tenants[0].is_active) {
      console.log('Activating tenant...');
      await sequelize.query('UPDATE tenants SET is_active = true WHERE id = 1');
      console.log('Tenant activated!');
    }
    
    await sequelize.close();
  } catch (error) {
    console.error('Error:', error);
    await sequelize.close();
  }
}

checkTenant();