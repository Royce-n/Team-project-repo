const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { query } = require('../config/database');

const execAsync = promisify(exec);

const LATEX_DIR = path.join(__dirname, '..', 'latex');
const TEMPLATES_DIR = path.join(LATEX_DIR, 'templates');
const OUTPUT_DIR = path.join(LATEX_DIR, 'output');
const SIGNATURES_DIR = path.join(LATEX_DIR, 'signatures');

/**
 * Ensure all required directories exist
 */
async function ensureDirectories() {
  const dirs = [LATEX_DIR, TEMPLATES_DIR, OUTPUT_DIR, SIGNATURES_DIR];
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error(`Error creating directory ${dir}:`, error);
    }
  }
}

/**
 * Convert base64 image to file for LaTeX
 * @param {string} base64Data - Base64 encoded image
 * @param {string} imageFormat - Image format (png, jpg, svg)
 * @param {string} fileName - Output file name
 * @returns {Promise<string>} - Path to saved image file
 */
async function saveSignatureImage(base64Data, imageFormat, fileName) {
  await ensureDirectories();

  // Remove data URI prefix if present
  const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Clean, 'base64');

  const filePath = path.join(SIGNATURES_DIR, `${fileName}.${imageFormat}`);
  await fs.writeFile(filePath, buffer);

  return filePath;
}

/**
 * Format checkbox for LaTeX (checked or unchecked)
 * @param {boolean} checked - Whether checkbox is checked
 * @returns {string} - LaTeX checkbox representation
 */
function formatCheckbox(checked) {
  return checked ? '$\\boxtimes$' : '$\\square$';
}

/**
 * Escape special LaTeX characters
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeLatex(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[&%$#_{}]/g, '\\$&')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

/**
 * Split text into multiple lines for form fields
 * @param {string} text - Text to split
 * @param {number} maxLength - Maximum characters per line
 * @param {number} maxLines - Maximum number of lines
 * @returns {Array<string>} - Array of lines
 */
function splitIntoLines(text, maxLength = 80, maxLines = 3) {
  if (!text) return Array(maxLines).fill('');

  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).length <= maxLength) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (lines.length < maxLines) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        break;
      }
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  // Pad with empty lines
  while (lines.length < maxLines) {
    lines.push('');
  }

  return lines;
}

/**
 * Generate petition PDF
 * @param {number} petitionId - Petition request ID
 * @returns {Promise<Object>} - Generated PDF info
 */
async function generatePetitionPDF(petitionId) {
  await ensureDirectories();

  // Fetch petition data with all related information
  const petitionResult = await query(
    `SELECT
      pr.*,
      pt.type_number,
      pt.type_name,
      u.name as student_name,
      u.email as student_email
     FROM petition_requests pr
     JOIN petition_types pt ON pr.petition_type_id = pt.id
     JOIN users u ON pr.user_id = u.id
     WHERE pr.id = $1`,
    [petitionId]
  );

  if (petitionResult.rows.length === 0) {
    throw new Error('Petition not found');
  }

  const petition = petitionResult.rows[0];

  // Fetch approval steps with signatures
  const stepsResult = await query(
    `SELECT
      ast.*,
      u.name as approver_name,
      si.image_data,
      si.image_format
     FROM approval_steps ast
     LEFT JOIN users u ON ast.approver_user_id = u.id
     LEFT JOIN signature_images si ON ast.signature_image_id = si.id
     WHERE ast.petition_request_id = $1
     ORDER BY ast.step_order ASC`,
    [petitionId]
  );

  // Parse petition-specific data
  const petitionData = typeof petition.petition_data === 'string'
    ? JSON.parse(petition.petition_data)
    : petition.petition_data;

  // Split student name
  const nameParts = petition.student_name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
  const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';

  // Prepare template replacements
  const replacements = {
    LAST_NAME: escapeLatex(lastName),
    FIRST_NAME: escapeLatex(firstName),
    MIDDLE_NAME: escapeLatex(middleName),
    UH_NUMBER: escapeLatex(petition.uh_number || ''),
    PHONE_NUMBER: escapeLatex(petition.phone_number || ''),
    STUDENT_PROGRAM_PLAN: escapeLatex(petition.current_program_plan || ''),
    MAILING_ADDRESS: escapeLatex(petition.mailing_address || ''),
    CITY: escapeLatex(petition.city || ''),
    STATE: escapeLatex(petition.state || ''),
    ZIP: escapeLatex(petition.zip || ''),
    EMAIL: escapeLatex(petition.student_email || ''),
    CURRENT_PROGRAM: escapeLatex(petition.current_program_plan || ''),
    CURRENT_CAREER: escapeLatex(petition.current_academic_career || ''),
    PETITION_EFFECTIVE_BEFORE: escapeLatex(petition.petition_effective_before_class || ''),
    PETITION_EFFECTIVE_AFTER: escapeLatex(petition.petition_effective_after_class || ''),
    SUBMISSION_DATE: petition.submitted_at
      ? new Date(petition.submitted_at).toLocaleDateString('en-US')
      : new Date().toLocaleDateString('en-US'),
    REQUEST_NUMBER: escapeLatex(petition.request_number),
    GENERATION_DATE: new Date().toLocaleString('en-US'),
  };

  // Set checkboxes for petition type
  for (let i = 1; i <= 17; i++) {
    replacements[`CHECKBOX_${i}`] = formatCheckbox(petition.type_number === i);
  }

  // Add petition-specific data (e.g., for Change of Major)
  if (petition.type_number === 5) {
    replacements.FROM_MAJOR = escapeLatex(petitionData.fromMajor || '');
    replacements.TO_MAJOR = escapeLatex(petitionData.toMajor || '');
  }

  // Split explanation into lines
  const explanationLines = splitIntoLines(petition.explanation, 100, 3);
  replacements.EXPLANATION_LINE_1 = escapeLatex(explanationLines[0]);
  replacements.EXPLANATION_LINE_2 = escapeLatex(explanationLines[1]);
  replacements.EXPLANATION_LINE_3 = escapeLatex(explanationLines[2]);

  // Process approval steps and signatures
  const approvalSteps = {
    advisor: null,
    chairperson: null,
    dean: null,
    provost: null,
  };

  // Map steps to roles
  for (const step of stepsResult.rows) {
    const role = step.approver_role.toLowerCase();
    if (role === 'chairperson') {
      approvalSteps.chairperson = step;
    } else {
      approvalSteps[role] = step;
    }
  }

  // Process each approval role
  const roles = ['advisor', 'chairperson', 'dean', 'provost'];
  const roleMapping = {
    advisor: 'ADVISOR',
    chairperson: 'CHAIR',
    dean: 'DEAN',
    provost: 'PROVOST'
  };

  for (const role of roles) {
    const step = approvalSteps[role];
    const roleUpper = roleMapping[role];

    if (step && step.status === 'approved') {
      replacements[`${roleUpper}_APPROVED`] = '$\\boxtimes$';
      replacements[`${roleUpper}_DISAPPROVED`] = '$\\square$';
      replacements[`${roleUpper}_NAME`] = escapeLatex(step.approver_name || '');
      replacements[`${roleUpper}_DATE`] = step.completed_at
        ? new Date(step.completed_at).toLocaleDateString('en-US')
        : '';

      // Save signature image if present
      if (step.image_data && step.image_format) {
        const signaturePath = await saveSignatureImage(
          step.image_data,
          step.image_format,
          `${petitionId}_${role}`
        );
        replacements[`HAS_${roleUpper}_SIGNATURE`] = 'true';
        replacements[`${roleUpper}_SIGNATURE_PATH`] = signaturePath;
      } else {
        replacements[`HAS_${roleUpper}_SIGNATURE`] = 'false';
        replacements[`${roleUpper}_SIGNATURE_PATH`] = '';
      }
    } else if (step && step.status === 'rejected') {
      replacements[`${roleUpper}_APPROVED`] = '$\\square$';
      replacements[`${roleUpper}_DISAPPROVED`] = '$\\boxtimes$';
      replacements[`${roleUpper}_NAME`] = escapeLatex(step.approver_name || '');
      replacements[`${roleUpper}_DATE`] = step.completed_at
        ? new Date(step.completed_at).toLocaleDateString('en-US')
        : '';
      replacements[`HAS_${roleUpper}_SIGNATURE`] = 'false';
      replacements[`${roleUpper}_SIGNATURE_PATH`] = '';
    } else {
      // Pending or not started
      replacements[`${roleUpper}_APPROVED`] = '$\\square$';
      replacements[`${roleUpper}_DISAPPROVED`] = '$\\square$';
      replacements[`${roleUpper}_NAME`] = '';
      replacements[`${roleUpper}_DATE`] = '';
      replacements[`HAS_${roleUpper}_SIGNATURE`] = 'false';
      replacements[`${roleUpper}_SIGNATURE_PATH`] = '';
    }
  }

  // Collect all comments
  const allComments = stepsResult.rows
    .filter((s) => s.comments)
    .map((s) => `${s.approver_role}: ${s.comments}`)
    .join('. ');
  const commentLines = splitIntoLines(allComments, 80, 3);
  replacements.COMMENTS_LINE_1 = escapeLatex(commentLines[0]);
  replacements.COMMENTS_LINE_2 = escapeLatex(commentLines[1]);
  replacements.COMMENTS_LINE_3 = escapeLatex(commentLines[2]);

  // Read template
  const templatePath = path.join(TEMPLATES_DIR, 'general_petition.tex');
  let template = await fs.readFile(templatePath, 'utf8');

  // Replace all placeholders
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    template = template.replace(regex, value);
  }

  // Write filled template
  const outputTexPath = path.join(OUTPUT_DIR, `petition_${petitionId}.tex`);
  await fs.writeFile(outputTexPath, template);

  // Get current PDF version
  const versionResult = await query(
    'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM stored_pdfs WHERE petition_request_id = $1',
    [petitionId]
  );
  const version = versionResult.rows[0].next_version;

  // Compile LaTeX to PDF using pdflatex
  const outputPdfPath = path.join(OUTPUT_DIR, `petition_${petitionId}_v${version}.pdf`);

  try {
    // Run pdflatex twice for proper reference resolution
    await execAsync(
      `pdflatex -interaction=nonstopmode -output-directory="${OUTPUT_DIR}" "${outputTexPath}"`,
      { cwd: OUTPUT_DIR }
    );
    await execAsync(
      `pdflatex -interaction=nonstopmode -output-directory="${OUTPUT_DIR}" "${outputTexPath}"`,
      { cwd: OUTPUT_DIR }
    );

    // Rename output file to include version
    const defaultPdfPath = path.join(OUTPUT_DIR, `petition_${petitionId}.pdf`);
    await fs.rename(defaultPdfPath, outputPdfPath);

    // Clean up auxiliary files
    const auxFiles = ['.aux', '.log', '.out'];
    for (const ext of auxFiles) {
      try {
        await fs.unlink(path.join(OUTPUT_DIR, `petition_${petitionId}${ext}`));
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  } catch (error) {
    console.error('LaTeX compilation error:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }

  // Get file size
  const stats = await fs.stat(outputPdfPath);

  // Store PDF metadata in database
  const isFinal = petition.status === 'approved';
  const pdfResult = await query(
    `INSERT INTO stored_pdfs (
      petition_request_id, version, file_path, file_name, file_size,
      latex_source_path, is_final, generated_by_user_id, generation_method
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'latex')
    RETURNING *`,
    [
      petitionId,
      version,
      outputPdfPath,
      `petition_${petitionId}_v${version}.pdf`,
      stats.size,
      outputTexPath,
      isFinal,
      petition.user_id,
    ]
  );

  // Log PDF generation action
  await query(
    `INSERT INTO approval_actions (petition_request_id, user_id, action_type, action_data)
     VALUES ($1, $2, 'pdf_generated', $3)`,
    [petitionId, petition.user_id, JSON.stringify({ version, fileSize: stats.size })]
  );

  return {
    pdfId: pdfResult.rows[0].id,
    version,
    filePath: outputPdfPath,
    fileName: pdfResult.rows[0].file_name,
    fileSize: stats.size,
    isFinal,
  };
}

/**
 * Get PDF file path for a specific version
 * @param {number} petitionId - Petition request ID
 * @param {number} version - PDF version (optional, defaults to latest)
 * @returns {Promise<string>} - File path
 */
async function getPDFPath(petitionId, version = null) {
  let queryText = `
    SELECT file_path
    FROM stored_pdfs
    WHERE petition_request_id = $1
  `;

  const params = [petitionId];

  if (version) {
    queryText += ' AND version = $2';
    params.push(version);
  } else {
    queryText += ' ORDER BY version DESC LIMIT 1';
  }

  const result = await query(queryText, params);

  if (result.rows.length === 0) {
    throw new Error('PDF not found');
  }

  return result.rows[0].file_path;
}

module.exports = {
  generatePetitionPDF,
  getPDFPath,
  ensureDirectories,
};
