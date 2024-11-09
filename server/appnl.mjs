import pg from 'pg';

class AppNodeLibrary {
  constructor() {
  }

  about() {
    return 'appNodeLibrary => appnl';
  }

  async connectPostgreSQL() {
    const { Client } = pg;
    const client = new Client({
      user: process.env.DB_USER || '',
      password: process.env.DB_PASS || '',
      host: process.env.DB_HOST || '',
      port: process.env.DB_PORT || '',
      database: process.env.DB_DATABASE || '',
    });
    await client.connect();
    return client;
  }
}
const appnl = new AppNodeLibrary();
export default appnl;