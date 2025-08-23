import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database';
import User, { UserRole } from '../models/User.model';
import Organization from '../models/Organization.model';

async function createUsers() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Ensure tables exist
    await sequelize.sync();

    // Create or find default organization
    const [org] = await Organization.findOrCreate({
      where: { name: 'AristoTest School' },
      defaults: {
        name: 'AristoTest School',
        slug: 'aristotest-school',
        settings: {
          features: {
            quizzes: true,
            analytics: true,
            reporting: true
          }
        },
        isActive: true
      }
    });
    console.log('✅ Organization ready:', org.name);

    // Hash password for all users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create Admin user
    const [, adminCreated] = await User.findOrCreate({
      where: { email: 'admin@aristotest.com' },
      defaults: {
        email: 'admin@aristotest.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        organizationId: org.id,
        isVerified: true,
        isActive: true,
        avatarUrl: 'https://ui-avatars.com/api/?name=Admin+User&background=6366f1&color=fff',
        metadata: {
          preferences: {
            theme: 'light',
            notifications: true,
            language: 'en'
          }
        }
      }
    });
    
    if (adminCreated) {
      console.log('✅ Admin user created: admin@aristotest.com');
    } else {
      console.log('ℹ️ Admin user already exists: admin@aristotest.com');
    }

    // Create Teacher user
    const [, teacherCreated] = await User.findOrCreate({
      where: { email: 'profesor@aristotest.com' },
      defaults: {
        email: 'profesor@aristotest.com',
        password: hashedPassword,
        firstName: 'Maria',
        lastName: 'Garcia',
        role: UserRole.TEACHER,
        organizationId: org.id,
        isVerified: true,
        isActive: true,
        avatarUrl: 'https://ui-avatars.com/api/?name=Maria+Garcia&background=10b981&color=fff',
        metadata: {
          preferences: {
            theme: 'light',
            notifications: true,
            language: 'es'
          }
        }
      }
    });
    
    if (teacherCreated) {
      console.log('✅ Teacher user created: profesor@aristotest.com');
    } else {
      console.log('ℹ️ Teacher user already exists: profesor@aristotest.com');
    }

    // Create Student user
    const [, studentCreated] = await User.findOrCreate({
      where: { email: 'alumno@aristotest.com' },
      defaults: {
        email: 'alumno@aristotest.com',
        password: hashedPassword,
        firstName: 'Juan',
        lastName: 'Pérez',
        role: UserRole.STUDENT,
        organizationId: org.id,
        isVerified: true,
        isActive: true,
        avatarUrl: 'https://ui-avatars.com/api/?name=Juan+Perez&background=f59e0b&color=fff',
        metadata: {
          preferences: {
            theme: 'light',
            notifications: true,
            language: 'es'
          }
        }
      }
    });
    
    if (studentCreated) {
      console.log('✅ Student user created: alumno@aristotest.com');
    } else {
      console.log('ℹ️ Student user already exists: alumno@aristotest.com');
    }

    console.log('\n📋 User Credentials:');
    console.log('================================');
    console.log('Admin:');
    console.log('  Email: admin@aristotest.com');
    console.log('  Password: password123');
    console.log('  Role: admin');
    console.log('');
    console.log('Teacher:');
    console.log('  Email: profesor@aristotest.com');
    console.log('  Password: password123');
    console.log('  Role: teacher');
    console.log('');
    console.log('Student:');
    console.log('  Email: alumno@aristotest.com');
    console.log('  Password: password123');
    console.log('  Role: student');
    console.log('================================');

    console.log('\n✅ All users created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating users:', error);
    process.exit(1);
  }
}

createUsers();