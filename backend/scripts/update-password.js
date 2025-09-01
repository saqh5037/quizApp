const bcrypt = require('bcryptjs');

async function updatePassword() {
  const password = 'Admin123!';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  
  console.log('Password: Admin123!');
  console.log('Hash to update in database:');
  console.log(hash);
  
  // SQL command to update
  console.log('\nSQL Command to run:');
  console.log(`UPDATE users SET password = '${hash}' WHERE email = 'admin@aristotest.com';`);
}

updatePassword();