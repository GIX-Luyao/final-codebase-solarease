const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'solarease',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
})

// Test connection on startup
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('Database connection error:', err.message)
  } else {
    console.log('Database connected successfully')
  }
})

module.exports = pool
