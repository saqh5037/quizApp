'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Crear tabla de Tenants (Organizaciones)
    await queryInterface.createTable('tenants', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      slug: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      type: {
        type: Sequelize.ENUM('internal', 'client'),
        defaultValue: 'client',
        allowNull: false
      },
      settings: {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: false
      },
      branding: {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
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

    // 2. Crear tabla de Classrooms (Salones)
    await queryInterface.createTable('classrooms', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
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
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      instructor_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      max_capacity: {
        type: Sequelize.INTEGER,
        defaultValue: 50,
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
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

    // 3. Crear tabla de Training Programs (Programas de Capacitación)
    await queryInterface.createTable('training_programs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
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
      classroom_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'classrooms',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      objectives: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      duration_hours: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
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

    // 4. Crear tabla de Program Quizzes (Relación Programa-Quiz)
    await queryInterface.createTable('program_quizzes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
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
      program_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'training_programs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      quiz_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'quizzes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sequence_order: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      is_mandatory: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      passing_score: {
        type: Sequelize.INTEGER,
        defaultValue: 70,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // 5. Crear tabla de Classroom Enrollments (Inscripciones)
    await queryInterface.createTable('classroom_enrollments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
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
      classroom_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'classrooms',
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
        type: Sequelize.ENUM('student', 'instructor', 'assistant'),
        defaultValue: 'student',
        allowNull: false
      },
      enrolled_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('active', 'completed', 'dropped'),
        defaultValue: 'active',
        allowNull: false
      }
    });

    // 6. Crear tabla de Certificates (Certificados)
    await queryInterface.createTable('certificates', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
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
      certificate_type: {
        type: Sequelize.ENUM('quiz', 'program', 'classroom', 'tenant'),
        allowNull: false
      },
      related_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      verification_code: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      issued_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      expiry_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: false
      },
      pdf_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      }
    });

    // 7. Agregar tenant_id a tablas existentes
    await queryInterface.addColumn('users', 'tenant_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.addColumn('quizzes', 'tenant_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.addColumn('quiz_sessions', 'tenant_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.addColumn('questions', 'tenant_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.addColumn('videos', 'tenant_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.addColumn('manuals', 'tenant_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    // 8. Crear índices para performance
    await queryInterface.addIndex('classrooms', ['tenant_id'], {
      name: 'idx_classroom_tenant'
    });

    await queryInterface.addIndex('training_programs', ['tenant_id'], {
      name: 'idx_program_tenant'
    });

    await queryInterface.addIndex('training_programs', ['classroom_id'], {
      name: 'idx_program_classroom'
    });

    await queryInterface.addIndex('program_quizzes', ['tenant_id'], {
      name: 'idx_program_quiz_tenant'
    });

    await queryInterface.addIndex('classroom_enrollments', ['tenant_id'], {
      name: 'idx_enrollment_tenant'
    });

    await queryInterface.addIndex('classroom_enrollments', ['classroom_id', 'user_id'], {
      name: 'idx_enrollment_unique',
      unique: true
    });

    await queryInterface.addIndex('certificates', ['tenant_id'], {
      name: 'idx_certificate_tenant'
    });

    await queryInterface.addIndex('certificates', ['tenant_id', 'user_id'], {
      name: 'idx_certificate_user'
    });

    await queryInterface.addIndex('certificates', ['verification_code'], {
      name: 'idx_certificate_verification'
    });

    await queryInterface.addIndex('users', ['tenant_id'], {
      name: 'idx_users_tenant'
    });

    await queryInterface.addIndex('quizzes', ['tenant_id'], {
      name: 'idx_quizzes_tenant'
    });

    await queryInterface.addIndex('quiz_sessions', ['tenant_id'], {
      name: 'idx_sessions_tenant'
    });

    await queryInterface.addIndex('questions', ['tenant_id'], {
      name: 'idx_questions_tenant'
    });

    await queryInterface.addIndex('videos', ['tenant_id'], {
      name: 'idx_videos_tenant'
    });

    await queryInterface.addIndex('manuals', ['tenant_id'], {
      name: 'idx_manuals_tenant'
    });

    // 9. Insertar tenant por defecto y migrar datos existentes
    await queryInterface.bulkInsert('tenants', [{
      id: 1,
      name: 'Dynamtek',
      slug: 'dynamtek',
      type: 'internal',
      settings: JSON.stringify({ default: true }),
      branding: JSON.stringify({ 
        logo: '/images/dynamtek-logo.png',
        primaryColor: '#0066CC',
        secondaryColor: '#00A3FF'
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }]);

    // 10. Actualizar registros existentes con tenant_id = 1
    await queryInterface.sequelize.query('UPDATE users SET tenant_id = 1 WHERE tenant_id IS NULL');
    await queryInterface.sequelize.query('UPDATE quizzes SET tenant_id = 1 WHERE tenant_id IS NULL');
    await queryInterface.sequelize.query('UPDATE quiz_sessions SET tenant_id = 1 WHERE tenant_id IS NULL');
    await queryInterface.sequelize.query('UPDATE questions SET tenant_id = 1 WHERE tenant_id IS NULL');
    await queryInterface.sequelize.query('UPDATE videos SET tenant_id = 1 WHERE tenant_id IS NULL');
    await queryInterface.sequelize.query('UPDATE manuals SET tenant_id = 1 WHERE tenant_id IS NULL');

    // 11. Crear classroom general para Dynamtek
    await queryInterface.bulkInsert('classrooms', [{
      tenant_id: 1,
      name: 'General',
      code: 'DYN-GEN-001',
      description: 'Salón general para capacitaciones de Dynamtek',
      max_capacity: 100,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }]);

    console.log('✅ Multi-tenant migration completed successfully');
  },

  down: async (queryInterface, Sequelize) => {
    // Eliminar índices
    await queryInterface.removeIndex('manuals', 'idx_manuals_tenant');
    await queryInterface.removeIndex('videos', 'idx_videos_tenant');
    await queryInterface.removeIndex('questions', 'idx_questions_tenant');
    await queryInterface.removeIndex('quiz_sessions', 'idx_sessions_tenant');
    await queryInterface.removeIndex('quizzes', 'idx_quizzes_tenant');
    await queryInterface.removeIndex('users', 'idx_users_tenant');
    await queryInterface.removeIndex('certificates', 'idx_certificate_verification');
    await queryInterface.removeIndex('certificates', 'idx_certificate_user');
    await queryInterface.removeIndex('certificates', 'idx_certificate_tenant');
    await queryInterface.removeIndex('classroom_enrollments', 'idx_enrollment_unique');
    await queryInterface.removeIndex('classroom_enrollments', 'idx_enrollment_tenant');
    await queryInterface.removeIndex('program_quizzes', 'idx_program_quiz_tenant');
    await queryInterface.removeIndex('training_programs', 'idx_program_classroom');
    await queryInterface.removeIndex('training_programs', 'idx_program_tenant');
    await queryInterface.removeIndex('classrooms', 'idx_classroom_tenant');

    // Eliminar columnas tenant_id de tablas existentes
    await queryInterface.removeColumn('manuals', 'tenant_id');
    await queryInterface.removeColumn('videos', 'tenant_id');
    await queryInterface.removeColumn('questions', 'tenant_id');
    await queryInterface.removeColumn('quiz_sessions', 'tenant_id');
    await queryInterface.removeColumn('quizzes', 'tenant_id');
    await queryInterface.removeColumn('users', 'tenant_id');

    // Eliminar tablas nuevas
    await queryInterface.dropTable('certificates');
    await queryInterface.dropTable('classroom_enrollments');
    await queryInterface.dropTable('program_quizzes');
    await queryInterface.dropTable('training_programs');
    await queryInterface.dropTable('classrooms');
    await queryInterface.dropTable('tenants');
  }
};