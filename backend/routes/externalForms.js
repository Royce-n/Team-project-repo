const express = require('express');
const router = express.Router();
const axios = require('axios');

const EXTERNAL_FORMS_API = 'https://arlington.rindeer.com/approvals/get-forms';

/**
 * GET /api/external-forms
 * Fetches available forms from the integrated team's system
 */
router.get('/', async (req, res) => {
  try {
    // Fetch forms from the other team's API
    const response = await axios.get(EXTERNAL_FORMS_API, {
      timeout: 10000, // 10 second timeout
    });

    // Return the forms data
    res.json({
      success: true,
      forms: response.data,
      source: 'arlington.rindeer.com'
    });
  } catch (error) {
    console.error('Error fetching external forms:', error.message);

    // Handle different error scenarios
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        success: false,
        error: 'Request timeout while fetching external forms'
      });
    }

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      return res.status(error.response.status).json({
        success: false,
        error: 'External service error',
        details: error.response.data
      });
    }

    // Network or other errors
    res.status(500).json({
      success: false,
      error: 'Failed to fetch external forms',
      details: error.message
    });
  }
});

/**
 * GET /api/external-forms/redirect/:formCode
 * Fetches the form link and returns redirect URL
 */
router.get('/redirect/:formCode', async (req, res) => {
  try {
    const { formCode } = req.params;

    // Fetch forms to get the correct URL
    const response = await axios.get(EXTERNAL_FORMS_API, {
      timeout: 10000,
    });

    // Find the form with matching form_code
    const form = response.data.find(f => f.form_code === formCode);

    if (!form) {
      return res.status(404).json({
        success: false,
        error: 'Form not found',
        formCode
      });
    }

    // Return the redirect URL
    res.json({
      success: true,
      redirectUrl: form.link,
      formName: form.name,
      formCode: form.form_code
    });
  } catch (error) {
    console.error('Error getting form redirect URL:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get form redirect URL',
      details: error.message
    });
  }
});

module.exports = router;
