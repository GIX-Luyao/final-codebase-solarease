const { Pool } = require('pg')
require('dotenv').config()

// Support DATABASE_URL or individual variables
const connectionString = process.env.DATABASE_URL
const isAzure = connectionString?.includes('azure.com') || process.env.DB_HOST?.includes('azure.com')
const sslConfig = isAzure ? { rejectUnauthorized: false } : false

// Build connection config
function getConnectionConfig(database) {
  if (connectionString) {
    // Parse DATABASE_URL and optionally override database
    const url = new URL(connectionString)
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: database || url.pathname.slice(1),
      user: url.username,
      password: url.password,
      ssl: sslConfig
    }
  }
  // Fallback to individual variables
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: database || process.env.DB_NAME || 'solarease',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: sslConfig
  }
}

// Main connection pool (will be set after setup)
let pool = null

const schema = `
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contract_analyses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    summary TEXT,
    key_terms JSONB,
    risk_flags JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contract_analyses_user_id ON contract_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
`

async function setupDatabase() {
  const config = getConnectionConfig()
  const targetDb = config.database

  // First connect to 'postgres' default database to create our database
  const setupPool = new Pool(getConnectionConfig('postgres'))

  try {
    // Check if our database exists
    const dbCheck = await setupPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [targetDb]
    )

    if (dbCheck.rows.length === 0) {
      console.log(`Creating database '${targetDb}'...`)
      await setupPool.query(`CREATE DATABASE ${targetDb}`)
      console.log(`Database '${targetDb}' created successfully`)
    }
  } catch (err) {
    // Database might already exist or other error
    if (!err.message.includes('already exists')) {
      console.error('Database setup error:', err.message)
    }
  } finally {
    await setupPool.end()
  }

  // Now connect to our target database
  pool = new Pool(getConnectionConfig(targetDb))

  // Create tables
  try {
    await pool.query(schema)
    console.log('Database tables ready')
  } catch (err) {
    console.error('Schema setup error:', err.message)
  }

  // Test connection
  try {
    await pool.query('SELECT NOW()')
    console.log('Database connected successfully')
  } catch (err) {
    console.error('Database connection error:', err.message)
  }
}

// Run setup and store the promise
let setupPromise = setupDatabase()

// Export a proxy that waits for pool to be ready
module.exports = {
  query: async (...args) => {
    // Wait for setup to complete before querying
    await setupPromise
    if (!pool) {
      throw new Error('Database not initialized')
    }
    return pool.query(...args)
  },
  getPool: () => pool,
  ready: () => setupPromise
}
