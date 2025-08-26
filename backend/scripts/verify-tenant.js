const { sequelize } = require('../dist/config/database');

async function verifyTenantSetup() {
  try {
    console.log('🔍 Verificando configuración multi-tenant...\n');
    
    // Check if tenants table exists and has data
    const [tenants] = await sequelize.query('SELECT * FROM tenants');
    console.log('✅ Tenants encontrados:', tenants.length);
    tenants.forEach(t => {
      console.log(`   - ${t.name} (ID: ${t.id}, Type: ${t.type}, Active: ${t.is_active})`);
    });
    
    // Check users with tenant_id
    const [users] = await sequelize.query('SELECT id, email, role, tenant_id FROM users');
    console.log('\n✅ Usuarios:', users.length);
    users.forEach(u => {
      console.log(`   - ${u.email} (Role: ${u.role}, Tenant ID: ${u.tenant_id || 'NULL'})`);
    });
    
    // Check classrooms
    const [classrooms] = await sequelize.query('SELECT * FROM classrooms');
    console.log('\n✅ Salones:', classrooms.length);
    classrooms.forEach(c => {
      console.log(`   - ${c.name} (Code: ${c.code}, Tenant ID: ${c.tenant_id})`);
    });
    
    // Update users without tenant_id
    const usersWithoutTenant = users.filter(u => !u.tenant_id);
    if (usersWithoutTenant.length > 0) {
      console.log('\n⚠️  Usuarios sin tenant_id:', usersWithoutTenant.length);
      console.log('   Actualizando usuarios para usar Dynamtek (tenant_id = 1)...');
      
      await sequelize.query('UPDATE users SET tenant_id = 1 WHERE tenant_id IS NULL');
      console.log('   ✅ Usuarios actualizados');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyTenantSetup();