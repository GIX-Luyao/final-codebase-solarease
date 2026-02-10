const express = require('express')
const pool = require('../db')
const { authenticateToken } = require('../middleware/auth')

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

// POST /api/contracts - Save a contract analysis
router.post('/', async (req, res) => {
  try {
    const { fileName, summary, keyTerms, riskFlags } = req.body
    const userId = req.user.id

    if (!fileName) {
      return res.status(400).json({ error: 'File name required' })
    }

    // Ensure JSONB fields are properly formatted
    const keyTermsJson = keyTerms ? JSON.stringify(keyTerms) : null
    const riskFlagsJson = riskFlags ? JSON.stringify(riskFlags) : null

    const result = await pool.query(
      `INSERT INTO contract_analyses (user_id, file_name, summary, key_terms, risk_flags)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
       RETURNING id, file_name, summary, key_terms, risk_flags, created_at`,
      [userId, fileName, summary || null, keyTermsJson, riskFlagsJson]
    )

    res.status(201).json({ contract: result.rows[0] })
  } catch (err) {
    console.error('Save contract error:', err)
    res.status(500).json({ error: 'Failed to save contract analysis' })
  }
})

// GET /api/contracts - List user's saved contracts
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id

    const result = await pool.query(
      `SELECT id, file_name, summary, created_at
       FROM contract_analyses
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    )

    res.json({ contracts: result.rows })
  } catch (err) {
    console.error('List contracts error:', err)
    res.status(500).json({ error: 'Failed to list contracts' })
  }
})

// GET /api/contracts/:id - Get single contract details
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id
    const contractId = parseInt(req.params.id)

    if (isNaN(contractId)) {
      return res.status(400).json({ error: 'Invalid contract ID' })
    }

    const result = await pool.query(
      `SELECT id, file_name, summary, key_terms, risk_flags, created_at
       FROM contract_analyses
       WHERE id = $1 AND user_id = $2`,
      [contractId, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' })
    }

    res.json({ contract: result.rows[0] })
  } catch (err) {
    console.error('Get contract error:', err)
    res.status(500).json({ error: 'Failed to get contract' })
  }
})

// DELETE /api/contracts/:id - Delete a saved contract
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id
    const contractId = parseInt(req.params.id)

    if (isNaN(contractId)) {
      return res.status(400).json({ error: 'Invalid contract ID' })
    }

    const result = await pool.query(
      `DELETE FROM contract_analyses
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [contractId, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' })
    }

    res.json({ message: 'Contract deleted successfully' })
  } catch (err) {
    console.error('Delete contract error:', err)
    res.status(500).json({ error: 'Failed to delete contract' })
  }
})

module.exports = router
