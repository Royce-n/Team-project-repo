const express = require('express');
const router = express.Router();
const pool = require('../config/database').pool;

/**
 * GET /approvals/get-forms
 * Public endpoint for external systems to fetch available petition forms
 * This mirrors the format of arlington.rindeer.com/approvals/get-forms
 */
router.get('/get-forms', async (req, res) => {
  try {
    // Fetch all petition types from the database
    const result = await pool.query(
      `SELECT
        petition_type_id,
        type_name,
        description,
        is_active
      FROM petition_types
      WHERE is_active = true
      ORDER BY type_name ASC`
    );

    // Transform the data to match the external API format
    const forms = result.rows.map(petition => ({
      form_code: `petition_type_${petition.petition_type_id}`,
      link: `https://aurora.jguliz.com/petitions/new?type=${petition.petition_type_id}`,
      name: petition.type_name,
      description: petition.description
    }));

    res.json(forms);
  } catch (error) {
    console.error('Error fetching petition types for external API:', error);
    res.status(500).json({
      error: 'Failed to fetch forms',
      message: error.message
    });
  }
});

/**
 * GET /approvals/forms/:formCode
 * Public endpoint that redirects to the petition form
 * This allows external systems to link directly to specific petition types
 */
router.get('/forms/:formCode', (req, res) => {
  const { formCode } = req.params;

  // Extract petition type ID from form code (e.g., "petition_type_1" -> "1")
  const petitionTypeId = formCode.replace('petition_type_', '');

  // Redirect to the new petition page with the type pre-selected
  res.redirect(`/petitions/new?type=${petitionTypeId}`);
});

module.exports = router;
