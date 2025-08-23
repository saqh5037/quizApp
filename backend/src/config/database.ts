import { Sequelize, Options } from 'sequelize';
import { env, isDevelopment, isProduction } from './environment';
import logger from '../utils/logger';
import path from 'path';

// Check if we should use SQLite (for local development without PostgreSQL)
const useSQLite = process.env.USE_SQLITE === 'true' || (!env.DB_HOST || env.DB_HOST === 'localhost');

// Database configuration interface
interface DatabaseConfig extends Options {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  storage?: string;
}

// Build database configuration
const buildDatabaseConfig = (): DatabaseConfig => {
  // Use SQLite for local development if PostgreSQL is not available
  if (useSQLite) {
    const baseConfig: DatabaseConfig = {
      dialect: 'sqlite',
      storage: path.join(__dirname, '../../database.sqlite'),
      logging: env.DB_LOGGING ? (msg) => logger.debug(msg) : false,
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
      benchmark: isDevelopment,
    };
    return baseConfig;
  }

  // PostgreSQL configuration
  const baseConfig: DatabaseConfig = {
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    dialect: 'postgres',
    
    // Logging configuration
    logging: env.DB_LOGGING ? (msg) => logger.debug(msg) : false,
    
    // Connection pool configuration
    pool: {
      max: env.DB_POOL_MAX || 10,
      min: env.DB_POOL_MIN || 2,
      acquire: env.DB_POOL_ACQUIRE || 30000,
      idle: env.DB_POOL_IDLE || 10000,
      evict: 1000,
    },
    
    // Model configuration
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
      paranoid: true, // Enable soft deletes globally
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    },
    
    // Query configuration
    query: {
      raw: false,
    },
    
    // Timezone configuration
    timezone: '+00:00',
    
    // Dialect options
    dialectOptions: {
      ssl: isProduction ? {
        require: true,
        rejectUnauthorized: false,
      } : false,
      keepAlive: true,
      statement_timeout: 10000,
      idle_in_transaction_session_timeout: 10000,
      decimalNumbers: true,
      dateStrings: false,
      typeCast: (field: any, next: any) => {
        // Handle DECIMAL type conversion
        if (field.type === 'DECIMAL' || field.type === 'NUMERIC') {
          const value = field.string();
          return value === null ? null : parseFloat(value);
        }
        return next();
      },
    },
    
    // Retry configuration
    retry: {
      max: 3,
      timeout: 3000,
      match: [
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /SequelizeConnectionAcquireTimeoutError/,
        /ETIMEDOUT/,
        /ECONNRESET/,
        /ECONNREFUSED/,
      ],
    },
    
    // Benchmark queries in development
    benchmark: isDevelopment,
  };

  return baseConfig;
};

// Create Sequelize instance
export const sequelize = new Sequelize(buildDatabaseConfig());

// Connection management
export const connectDatabase = async (): Promise<void> => {
  try {
    // Test the connection
    await sequelize.authenticate();
    logger.info('✅ Database connection established successfully.');
    
    // Log connection details (without password)
    if (useSQLite) {
      logger.info(`📊 Connected to SQLite database: database.sqlite`);
    } else {
      logger.info(`📊 Connected to PostgreSQL database: ${env.DB_NAME} on ${env.DB_HOST}:${env.DB_PORT}`);
    }
    
    // Don't sync if using SQLite with existing database
    if (isDevelopment && !useSQLite) {
      await sequelize.sync({ alter: false }); // Set to true with caution
      logger.info('✅ Database synchronized.');
    }
    
    // Set up connection event handlers (only for PostgreSQL)
    if (!useSQLite) {
      setupConnectionHandlers();
    }
    
  } catch (error) {
    logger.error('❌ Unable to connect to the database:', error);
    
    // Retry logic
    if (isDevelopment) {
      logger.info('Retrying database connection in 5 seconds...');
      setTimeout(() => connectDatabase(), 5000);
    } else {
      process.exit(1);
    }
  }
};

// Disconnect from database
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await sequelize.close();
    logger.info('Database connection closed gracefully.');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
};

// Setup connection event handlers
const setupConnectionHandlers = (): void => {
  // Handle connection errors
  sequelize.connectionManager.on('connect', (connection: any) => {
    logger.debug('New database connection established');
  });

  sequelize.connectionManager.on('disconnect', (connection: any) => {
    logger.warn('Database connection lost');
  });

  sequelize.connectionManager.on('error', (error: any) => {
    logger.error('Database connection error:', error);
  });
};

// Database health check
export const checkDatabaseHealth = async (): Promise<{
  healthy: boolean;
  details: any;
}> => {
  try {
    const [results] = await sequelize.query('SELECT 1 + 1 AS result');
    const poolStats = (sequelize.connectionManager as any).pool;
    
    return {
      healthy: true,
      details: {
        connected: true,
        database: env.DB_NAME,
        host: env.DB_HOST,
        port: env.DB_PORT,
        pool: {
          size: poolStats?.size || 0,
          available: poolStats?.available || 0,
          using: poolStats?.using || 0,
          waiting: poolStats?.waiting || 0,
        },
        latency: 0, // Can be calculated if needed
      },
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      healthy: false,
      details: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
};

// Transaction helper
export const transaction = async <T>(
  callback: (t: any) => Promise<T>
): Promise<T> => {
  const t = await sequelize.transaction();
  
  try {
    const result = await callback(t);
    await t.commit();
    return result;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

// Execute raw SQL with proper error handling
export const executeRawSQL = async (
  sql: string,
  replacements?: any
): Promise<any> => {
  try {
    const result = await sequelize.query(sql, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    });
    return result;
  } catch (error) {
    logger.error('Raw SQL execution failed:', error);
    throw error;
  }
};

// Database migration helper
export const runMigration = async (migrationPath: string): Promise<void> => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const migrationSQL = fs.readFileSync(
      path.resolve(migrationPath),
      'utf-8'
    );
    
    await sequelize.query(migrationSQL);
    logger.info(`Migration executed successfully: ${migrationPath}`);
  } catch (error) {
    logger.error(`Migration failed: ${migrationPath}`, error);
    throw error;
  }
};

// Database backup helper (PostgreSQL specific)
export const createBackup = async (backupPath: string): Promise<void> => {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  const command = `pg_dump -h ${env.DB_HOST} -p ${env.DB_PORT} -U ${env.DB_USER} -d ${env.DB_NAME} -f ${backupPath}`;
  
  try {
    await execPromise(command, {
      env: { ...process.env, PGPASSWORD: env.DB_PASSWORD },
    });
    logger.info(`Database backup created: ${backupPath}`);
  } catch (error) {
    logger.error('Database backup failed:', error);
    throw error;
  }
};

// Export configured sequelize instance
export default sequelize;