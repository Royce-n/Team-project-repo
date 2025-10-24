# LaTeX PDF Generation

This directory contains the LaTeX templates and resources for generating petition PDFs.

## Directory Structure

```
latex/
├── templates/          # LaTeX templates
│   └── general_petition.tex
├── output/            # Generated PDFs (auto-created)
├── signatures/        # Signature images (auto-created)
├── Makefile          # Build commands
└── README.md         # This file
```

## Setup

### Required Assets

#### UH Logo
The LaTeX template requires a UH logo file. You need to add:
- **File**: `uh_logo.png`
- **Location**: `backend/latex/templates/`
- **Recommended size**: 200x200 pixels or larger
- **Format**: PNG with transparent background

You can download the official UH logo from:
https://uh.edu/marcom/guidelines-policies/brand-guidelines/logos/

Place the logo file in the templates directory:
```bash
cp /path/to/uh_logo.png backend/latex/templates/
```

Alternatively, you can modify the `general_petition.tex` file to remove or replace the logo:
```latex
% Comment out or remove this line:
\fancyhead[R]{\includegraphics[height=0.6in]{uh_logo.png}}
```

## Usage

### Generate PDF (via Node.js)

The PDF generation is handled automatically by the backend when petitions are submitted or approved.

```javascript
const { generatePetitionPDF } = require('./services/pdfGenerator');

const pdfInfo = await generatePetitionPDF(petitionId);
console.log(`PDF generated: ${pdfInfo.filePath}`);
```

### Generate PDF (via Makefile)

You can also compile PDFs manually using the Makefile:

```bash
# Compile a specific petition
cd backend/latex
make compile PETITION_ID=123

# Clean auxiliary files
make clean

# Clean all generated files
make clean-all

# Test LaTeX installation
make test

# List generated PDFs
make list
```

## LaTeX Template Placeholders

The template uses placeholder variables that are replaced at compile time:

### Student Information
- `{{LAST_NAME}}`, `{{FIRST_NAME}}`, `{{MIDDLE_NAME}}`
- `{{UH_NUMBER}}`, `{{PHONE_NUMBER}}`
- `{{MAILING_ADDRESS}}`, `{{CITY}}`, `{{STATE}}`, `{{ZIP}}`
- `{{EMAIL}}`

### Petition Details
- `{{PETITION_EFFECTIVE_BEFORE}}`, `{{PETITION_EFFECTIVE_AFTER}}`
- `{{CURRENT_PROGRAM}}`, `{{CURRENT_CAREER}}`
- `{{FROM_MAJOR}}`, `{{TO_MAJOR}}` (for Change of Major)
- `{{EXPLANATION_LINE_1}}`, `{{EXPLANATION_LINE_2}}`, `{{EXPLANATION_LINE_3}}`

### Checkboxes
- `{{CHECKBOX_1}}` through `{{CHECKBOX_17}}` (petition type selection)

### Approval Signatures
For each role (ADVISOR, CHAIR, DEAN, PROVOST):
- `{{ROLE_APPROVED}}`, `{{ROLE_DISAPPROVED}}` (checked boxes)
- `{{ROLE_NAME}}`, `{{ROLE_DATE}}`
- `{{HAS_ROLE_SIGNATURE}}` (true/false)
- `{{ROLE_SIGNATURE_PATH}}` (path to signature image)

### Comments
- `{{COMMENTS_LINE_1}}`, `{{COMMENTS_LINE_2}}`, `{{COMMENTS_LINE_3}}`

### Metadata
- `{{REQUEST_NUMBER}}`, `{{SUBMISSION_DATE}}`, `{{GENERATION_DATE}}`

## Troubleshooting

### LaTeX Compilation Errors

**Error**: `! LaTeX Error: File 'uh_logo.png' not found`
- **Solution**: Add the UH logo to `backend/latex/templates/` or comment out the logo line

**Error**: `! Undefined control sequence`
- **Solution**: Check that all template placeholders have been replaced before compilation

**Error**: `! Package inputenc Error: Unicode character`
- **Solution**: Ensure text is properly escaped using the `escapeLatex()` function

### PDF Not Generating

1. Check LaTeX is installed:
   ```bash
   which pdflatex
   pdflatex --version
   ```

2. Check directory permissions:
   ```bash
   ls -la backend/latex/
   ```

3. Check LaTeX log files:
   ```bash
   cat backend/latex/output/petition_*.log
   ```

4. Manually compile to see errors:
   ```bash
   cd backend/latex/output
   pdflatex petition_123.tex
   ```

## Required LaTeX Packages

The template uses these LaTeX packages:
- `geometry` - Page layout
- `graphicx` - Image inclusion
- `array` - Enhanced tables
- `fancyhdr` - Header/footer customization
- `tabularx` - Advanced tables
- `hyperref` - PDF hyperlinks
- `xcolor` - Color support
- `ifthen` - Conditional logic

All packages are included in TeX Live. If you get package errors, install:

**Ubuntu/Debian**:
```bash
sudo apt-get install texlive-latex-base texlive-latex-extra texlive-fonts-recommended
```

**macOS**:
```bash
brew install --cask mactex-no-gui
```

**Alpine (Docker)**:
```dockerfile
RUN apk add --no-cache texlive texlive-latex-extra texmf-dist-fontsextra
```

## Performance Tips

1. **Cache Compiled PDFs**: Store PDFs in the database to avoid recompilation
2. **Background Processing**: Generate PDFs asynchronously using a job queue
3. **Limit Regeneration**: Only regenerate PDFs when necessary (on approval)
4. **Clean Up**: Regularly clean up old PDFs and auxiliary files

## Security Considerations

1. **Input Sanitization**: All data is escaped before LaTeX compilation
2. **Path Validation**: File paths are validated to prevent directory traversal
3. **File Size Limits**: Signature images are limited to 2MB
4. **Access Control**: Only authorized users can generate/download PDFs

## Customization

To customize the template:

1. Edit `templates/general_petition.tex`
2. Test changes manually:
   ```bash
   cd backend/latex/output
   pdflatex ../templates/general_petition.tex
   ```
3. Verify all placeholders are replaced correctly
4. Update `pdfGenerator.js` if adding new fields

## Support

For LaTeX-related issues:
- LaTeX documentation: https://www.latex-project.org/help/
- TeX Stack Exchange: https://tex.stackexchange.com/
- Package documentation: `texdoc <package-name>`
