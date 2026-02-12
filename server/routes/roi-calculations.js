const express = require('express')
const pool = require('../db')
const { authenticateToken } = require('../middleware/auth')

const router = express.Router()

// Ensure table exists
async function ensureTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roi_calculations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        participants JSONB,
        roi_data JSONB,
        threat_points JSONB,
        ppa_config JSONB,
        nash_results JSONB,
        cooperative_value DECIMAL,
        ai_summary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_roi_calculations_user_id ON roi_calculations(user_id)
    `)
  } catch (err) {
    console.error('Error creating roi_calculations table:', err.message)
  }
}

// Create table on module load
ensureTable()

// All routes require authentication
router.use(authenticateToken)

// POST /api/roi-calculations - Save an ROI calculation
router.post('/', async (req, res) => {
  try {
    const { name, participants, roiData, threatPoints, ppaConfig, nashResults, cooperativeValue, aiSummary } = req.body
    const userId = req.user.id

    if (!name) {
      return res.status(400).json({ error: 'Calculation name required' })
    }

    // Ensure JSONB fields are properly formatted
    const participantsJson = participants ? JSON.stringify(participants) : null
    const roiDataJson = roiData ? JSON.stringify(roiData) : null
    const threatPointsJson = threatPoints ? JSON.stringify(threatPoints) : null
    const ppaConfigJson = ppaConfig ? JSON.stringify(ppaConfig) : null
    const nashResultsJson = nashResults ? JSON.stringify(nashResults) : null

    // Extract numeric value from cooperativeValue (it may be an object with totalCooperativeValue)
    let cooperativeValueNum = null
    if (cooperativeValue !== null && cooperativeValue !== undefined) {
      if (typeof cooperativeValue === 'object') {
        cooperativeValueNum = cooperativeValue.totalCooperativeValue || cooperativeValue.total_value || null
      } else if (typeof cooperativeValue === 'number') {
        cooperativeValueNum = cooperativeValue
      }
    }

    const result = await pool.query(
      `INSERT INTO roi_calculations (user_id, name, participants, roi_data, threat_points, ppa_config, nash_results, cooperative_value, ai_summary)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9)
       RETURNING id, name, participants, roi_data, threat_points, ppa_config, nash_results, cooperative_value, ai_summary, created_at`,
      [userId, name, participantsJson, roiDataJson, threatPointsJson, ppaConfigJson, nashResultsJson, cooperativeValueNum, aiSummary || null]
    )

    res.status(201).json({ calculation: result.rows[0] })
  } catch (err) {
    console.error('Save ROI calculation error:', err)
    res.status(500).json({ error: 'Failed to save ROI calculation' })
  }
})

// GET /api/roi-calculations - List user's saved ROI calculations
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id

    const result = await pool.query(
      `SELECT id, name, participants, cooperative_value, created_at
       FROM roi_calculations
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    )

    res.json({ calculations: result.rows })
  } catch (err) {
    console.error('List ROI calculations error:', err)
    res.status(500).json({ error: 'Failed to list ROI calculations' })
  }
})

// GET /api/roi-calculations/:id - Get single ROI calculation details
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id
    const calculationId = parseInt(req.params.id)

    if (isNaN(calculationId)) {
      return res.status(400).json({ error: 'Invalid calculation ID' })
    }

    const result = await pool.query(
      `SELECT id, name, participants, roi_data, threat_points, ppa_config, nash_results, cooperative_value, ai_summary, created_at
       FROM roi_calculations
       WHERE id = $1 AND user_id = $2`,
      [calculationId, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ROI calculation not found' })
    }

    res.json({ calculation: result.rows[0] })
  } catch (err) {
    console.error('Get ROI calculation error:', err)
    res.status(500).json({ error: 'Failed to get ROI calculation' })
  }
})

// DELETE /api/roi-calculations/:id - Delete a saved ROI calculation
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id
    const calculationId = parseInt(req.params.id)

    if (isNaN(calculationId)) {
      return res.status(400).json({ error: 'Invalid calculation ID' })
    }

    const result = await pool.query(
      `DELETE FROM roi_calculations
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [calculationId, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ROI calculation not found' })
    }

    res.json({ message: 'ROI calculation deleted successfully' })
  } catch (err) {
    console.error('Delete ROI calculation error:', err)
    res.status(500).json({ error: 'Failed to delete ROI calculation' })
  }
})

module.exports = router
