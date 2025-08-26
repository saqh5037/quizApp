import { sequelize } from '../config/database';

async function verifyTenantSetup() {
  try {
    console.log('🔍 Verificando configuración multi-tenant...\n');
    
    // Check if tenants table exists and has data
    const [tenants]: any = await sequelize.query('SELECT * FROM tenants');
    console.log('✅ Tenants encontrados:', tenants.length);
    tenants.forEach((t: any) => {
      console.log(`   - ${t.name} (ID: ${t.id}, Type: ${t.type}, Active: ${t.is_active})`);
    });
    
    // Check users with tenant_id
    const [users]: any = await sequelize.query('SELECT id, email, role, tenant_id FROM users');
    console.log('\n✅ Usuarios:', users.length);
    users.forEach((u: any) => {
      console.log(`   - ${u.email} (Role: ${u.role}, Tenant ID: ${u.tenant_id || 'NULL'})`);
    });
    
    // Check classrooms
    const [classrooms]: any = await sequelize.query('SELECT * FROM classrooms');
    console.log('\n✅ Salones:', classrooms.length);
    classrooms.forEach((c: any) => {
      console.log(`   - ${c.name} (Code: ${c.code}, Tenant ID: ${c.tenant_id})`);
    });
    
    // Update users without tenant_id
    const usersWithoutTenant = users.filter((u: any) => !u.tenant_id);
    if (usersWithoutTenant.length > 0) {
      console.log('\n⚠️  Usuarios sin tenant_id:', usersWithoutTenant.length);
      console.log('   Actualizando usuarios para usar Dynamtek (tenant_id = 1)...');
      
      await sequelize.query('UPDATE users SET tenant_id = 1 WHERE tenant_id IS NULL');
      console.log('   ✅ Usuarios actualizados');
    } else {
      console.log('\n✅ Todos los usuarios tienen tenant_id asignado');
    }
    
    // Also update quizzes without tenant_id
    const [quizzes]: any = await sequelize.query('SELECT COUNT(*) as count FROM quizzes WHERE tenant_id IS NULL');
    if (quizzes[0].count > 0) {
      console.log(`\n⚠️  Quizzes sin tenant_id: ${quizzes[0].count}`);
      console.log('   Actualizando quizzes para usar Dynamtek (tenant_id = 1)...');
      await sequelize.query('UPDATE quizzes SET tenant_id = 1 WHERE tenant_id IS NULL');
      console.log('   ✅ Quizzes actualizados');
    }
    
    console.log('\n🎉 Verificación completada exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyTenantSetup();