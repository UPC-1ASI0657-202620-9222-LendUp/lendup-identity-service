import { Provider } from '@nestjs/common';
import { createPool } from 'mysql2/promise';

export const MYSQL_POOL = Symbol('MYSQL_POOL');

export const MySqlPoolProvider: Provider = {
  provide: MYSQL_POOL,
  useFactory: async () => {
    if (!process.env.DB_PASSWORD) {
      throw new Error('DB_PASSWORD es obligatorio para conectar Identidad con MySQL');
    }
    const pool = createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3309),
      user: process.env.DB_USERNAME || 'lendup_identidad',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'lendup_identidad',
      waitForConnections: true,
      connectionLimit: 10,
      timezone: 'Z',
      decimalNumbers: false
    });
    try {
      await pool.query('SELECT 1');
      return pool;
    } catch (error) {
      await pool.end();
      throw error;
    }
  }
};
