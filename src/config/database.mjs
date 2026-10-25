import pg from "pg";
import fs from 'node:fs';
import 'dotenv/config';

export const databaseConfig = () => ({
  user: process.env.DB_USER || '',
  password: process.env.DB_PASS || '',
  host: process.env.DB_HOST || '',
  port: process.env.DB_PORT || '',
  database: process.env.DB_DATABASE || '',
  connectionTimeoutMillis: 5000,
  statement_timeout: 30_000,
  idle_in_transaction_session_timeout: 30_000,
  ...(process.env.DB_SSL === 'true' ? { ssl: {
    rejectUnauthorized: true,
    ...(process.env.DB_SSL_CA ? { ca: fs.readFileSync(process.env.DB_SSL_CA, 'utf8') } : {}),
  } } : {}),
});

class Database {
    async connectPostgreSQL() {
    const { Client } = pg;
    const client = new Client(databaseConfig());
    await client.connect();
    return client;
  }
}
const database = new Database();
export default database;
