const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const pool = mysql.createPool({
  host: process.env.VTB_DB_HOST || process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.VTB_DB_PORT || process.env.DB_PORT, 10) || 3306,
  user: process.env.VTB_DB_USER || process.env.DB_USER || 'root',
  password: process.env.VTB_DB_PASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.VTB_DB_NAME || process.env.DB_NAME || 'aiwork',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  timezone: '+08:00',
});

module.exports = pool;
