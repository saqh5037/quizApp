import { Sequelize } from 'sequelize';
import path from 'path';

// SQLite configuration for local development
export const sequelizeSQLite = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../database.sqlite'),
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
  },
});

export default sequelizeSQLite;