import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

// Parse DATABASE_URL or use individual env vars
const databaseUrl = process.env.DATABASE_URL;

let sequelize;

if (databaseUrl) {
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: console.log, // Enable full SQL logging for debugging
    timezone: '+00:00',
    dialectOptions: {
      connectTimeout: 60000,
      useUTC: true,
      timezone: 'UTC',
      searchPath: 'public'
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: false,        // Most tables don't have updated_at
      freezeTableName: true     // Don't pluralize table names
    }
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'unigo',
    process.env.DB_USER || 'unigo',
    process.env.DB_PASSWORD || 'unigo',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: console.log, // Enable full SQL logging for debugging
      timezone: '+00:00',
      dialectOptions: {
        useUTC: true,
        timezone: 'UTC',
        searchPath: 'public'
      },
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      define: {
        timestamps: false,        // Most tables don't have updated_at
        freezeTableName: true     // Don't pluralize table names
      }
    }
  );
}

// Test database connection
export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Database connection established successfully');
    return true;
  } catch (error) {
    logger.error('❌ Unable to connect to database:', error);
    throw error;
  }
};

export { sequelize };
export default sequelize;
