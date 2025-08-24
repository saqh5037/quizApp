const { Sequelize } = require('sequelize');
const bcrypt = require('bcrypt');

async function checkAndCreateUser() {
  const sequelize = new Sequelize('aristotest', 'postgres', 'postgres', {
    host: 'localhost',
    dialect: 'postgres',
    logging: false
  });

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check existing users
    const [users] = await sequelize.query('SELECT id, email, is_active FROM users');
    console.log('\n📋 Existing users:');
    users.forEach(user => {
      console.log(`  ID: ${user.id}, Email: ${user.email}, Active: ${user.is_active}`);
    });

    // If no admin user exists, create one
    if (users.length === 0 || !users.find(u => u.email === 'admin@aristotest.com')) {
      console.log('\n🔨 Creating admin user...');
      
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const now = new Date();
      
      await sequelize.query(`
        INSERT INTO users (email, password, first_name, last_name, role, is_active, created_at, updated_at)
        VALUES ('admin@aristotest.com', :password, 'Admin', 'User', 'teacher', true, :now, :now)
        ON CONFLICT (email) DO UPDATE SET is_active = true, updated_at = :now
      `, {
        replacements: { password: hashedPassword, now }
      });
      
      console.log('✅ Admin user created/updated');
      console.log('   Email: admin@aristotest.com');
      console.log('   Password: admin123');
    }

    // Check users again
    const [updatedUsers] = await sequelize.query('SELECT id, email, is_active FROM users');
    console.log('\n📋 Updated user list:');
    updatedUsers.forEach(user => {
      console.log(`  ID: ${user.id}, Email: ${user.email}, Active: ${user.is_active}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkAndCreateUser();