'use strict';
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3309),
    user: process.env.DB_USERNAME || 'lendup_identidad',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'lendup_identidad',
    multipleStatements: false
  });
  try {
    await connection.execute('CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(80) PRIMARY KEY, aplicada_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)) ENGINE=InnoDB');
    const folder = path.resolve(__dirname, '..', 'db', 'migrations');
    const files = fs.readdirSync(folder).filter(name => /^\d+_[\w-]+\.sql$/.test(name)).sort();
    for (const filename of files) {
      const [rows] = await connection.execute('SELECT version FROM schema_migrations WHERE version=?', [filename]);
      if (rows.length) {
        console.log('Ya aplicada:', filename);
        continue;
      }
      // Las sentencias de estas migraciones no contienen delimitadores internos.
      const sql = fs.readFileSync(path.join(folder, filename), 'utf8');
      const commands = sql.split(';').map(part => part.trim()).filter(Boolean);
      for (const command of commands) await connection.query(command);
      await connection.execute('INSERT INTO schema_migrations(version) VALUES (?)', [filename]);
      console.log('Migración aplicada:', filename);
    }
  } finally {
    await connection.end();
  }
}

run().catch(error => {
  console.error('No se pudo aplicar la migración:', error.message);
  process.exitCode = 1;
});
