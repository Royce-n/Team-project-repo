# Approval System Implementation

## Overview

This document describes the implementation of the approval system for the University of Houston General Petition process, with a focus on the **Change of Major** petition (Type 5).

## Features Implemented

### 1. Database Schema

The approval system uses the following database tables:

- **`signature_images`**: Stores user signature images for PDF generation
- **`petition_types`**: Defines the 17 petition types from the UH General Petition form
- **`petition_requests`**: Main table for petition submissions and lifecycle tracking
- **`approval_steps`**: Tracks individual approval steps in the workflow chain
- **`approval_actions`**: Audit log of all actions taken on petitions
- **`stored_pdfs`**: Stores versioned PDFs generated at each approval step
- **`approver_assignments`**: Defines which users can approve petitions in specific roles

### 2. Backend API

#### Signature Management (`/api/signatures`)
- `POST /upload` - Upload or update user signature
- `GET /my-signature` - Get current user's active signature
- `GET /user/:userId` - Get a specific user's signature (approvers only)
- `DELETE /my-signature` - Delete current user's signature
- `GET /history` - Get signature upload history

#### Petition Management (`/api/petitions`)
- `POST /` - Create a new petition (draft)
- `GET /` - List petitions (filtered by user role)
- `GET /:id` - Get petition details with approval steps
- `PUT /:id` - Update a draft petition
- `POST /:id/submit` - Submit a petition for approval
- `DELETE /:id` - Delete a draft petition
- `GET /types/list` - Get all petition types

#### Approval Workflow (`/api/approvals`)
- `POST /:petitionId/approve` - Approve a petition at current step
- `POST /:petitionId/reject` - Reject a petition
- `POST /:petitionId/return` - Return a petition for additional information
- `POST /:petitionId/resubmit` - Resubmit a returned petition
- `GET /my-queue` - Get petitions awaiting approval from current user

#### PDF Generation (`/api/pdfs`)
- `POST /generate/:petitionId` - Generate PDF for a petition
- `GET /:petitionId/download` - Download the latest PDF
- `GET /:petitionId/view` - View PDF in browser
- `GET /:petitionId/versions` - Get all PDF versions

### 3. Frontend Components

#### Pages
- **`NewPetition.js`**: Form for creating a new petition (Change of Major)
- **`PetitionsList.js`**: List of user's petitions with filtering and status tracking
- **`PetitionDetail.js`**: Detailed view of a petition with approval workflow
- **`ApprovalQueue.js`**: Queue of petitions awaiting approval (for approvers)

#### Components
- **`SignatureUpload.js`**: Component for uploading and managing electronic signatures

### 4. Approval Workflow States

The petition follows this state machine:

```
draft → submitted → pending → in_review → approved/rejected/returned
                                    ↓
                                  returned → pending (after resubmit)
```

#### State Descriptions:
- **draft**: Petition created but not submitted
- **submitted**: Petition submitted, awaiting first review
- **pending**: In approval chain, waiting for next approver
- **in_review**: Currently being reviewed by an approver
- **approved**: All approvals received
- **rejected**: Denied by an approver
- **returned**: Sent back to student for additional information

### 5. Approval Chain

For Change of Major petitions, the approval chain is:

1. **Advisor/Instructor**
2. **Chairperson**
3. **College Dean**
4. **(Optional) Sr. Vice President/Provost** - Only for general degree requirement exceptions

Each approver can:
- **Approve**: Move petition to next step
- **Reject**: Terminate the petition with reason
- **Return**: Send back to student for modifications

### 6. PDF Generation

The system uses LaTeX to generate properly formatted PDF documents that match the official UH General Petition form.

#### PDF Workflow:
1. Student submits petition
2. System generates initial PDF with student information
3. After each approval, system generates a new versioned PDF with the approver's signature
4. Final PDF includes all signatures and is marked as `is_final = TRUE`

#### LaTeX Template:
- Located at: `backend/latex/templates/general_petition.tex`
- Includes all form fields from the official UH form
- Supports signature image embedding
- Generates professional, print-ready PDFs

#### Makefile:
- Located at: `backend/latex/Makefile`
- Provides commands for compiling, cleaning, and managing PDFs
- Usage: `make compile PETITION_ID=<id>`

### 7. Audit Logging

All actions on petitions are logged in the `approval_actions` table:

- `created`: Petition created
- `updated`: Petition modified
- `submitted`: Petition submitted for approval
- `assigned`: Approver assigned
- `approved`: Step approved
- `rejected`: Petition rejected
- `returned`: Returned for changes
- `commented`: Comment added
- `pdf_generated`: PDF generated
- `signature_added`: Signature uploaded

## Database Migration

To apply the approval system schema, run:

```bash
psql -h localhost -U postgres -d user_management -f database/migrations/002_approval_system.sql
```

Or connect to your PostgreSQL database and execute the migration file.

## Setup Instructions

### 1. Backend Setup

Install LaTeX dependencies (Ubuntu/Debian):
```bash
sudo apt-get update
sudo apt-get install -y texlive-latex-base texlive-latex-extra texlive-fonts-recommended
```

Install LaTeX dependencies (macOS):
```bash
brew install --cask mactex-no-gui
```

### 2. Docker Setup

The Docker image automatically installs LaTeX when building:
```bash
docker-compose up --build
```

### 3. Database Migration

Run the migration to create approval system tables:
```bash
# Connect to the database container
docker exec -it user_management_db psql -U postgres -d user_management

# Then run the migration
\i /docker-entrypoint-initdb.d/002_approval_system.sql
```

Or copy the migration file to the database container:
```bash
docker cp database/migrations/002_approval_system.sql user_management_db:/tmp/
docker exec -it user_management_db psql -U postgres -d user_management -f /tmp/002_approval_system.sql
```

### 4. Configure Approver Roles

To assign users as approvers, insert records into `approver_assignments`:

```sql
-- Make user with ID 2 an advisor
INSERT INTO approver_assignments (user_id, approver_role, department, is_active)
VALUES (2, 'advisor', 'Computer Science', TRUE);

-- Make user with ID 3 a chairperson
INSERT INTO approver_assignments (user_id, approver_role, department, is_active)
VALUES (3, 'chairperson', 'Computer Science', TRUE);

-- Make user with ID 4 a dean
INSERT INTO approver_assignments (user_id, approver_role, college, is_active)
VALUES (4, 'dean', 'College of Natural Sciences and Mathematics', TRUE);

-- Make user with ID 5 a provost
INSERT INTO approver_assignments (user_id, approver_role, is_active)
VALUES (5, 'provost', TRUE);
```

## API Usage Examples

### 1. Upload Signature

```javascript
const formData = {
  imageData: 'base64_encoded_image_data',
  imageFormat: 'png'
};

const response = await fetch('/api/signatures/upload', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(formData)
});
```

### 2. Create Petition

```javascript
const petitionData = {
  petitionTypeId: 5,  // Change of Major
  uhNumber: '1234567',
  phoneNumber: '(713) 123-4567',
  mailingAddress: '123 Main St',
  city: 'Houston',
  state: 'TX',
  zip: '77004',
  petitionData: {
    fromMajor: 'Computer Science',
    toMajor: 'Data Science'
  },
  explanation: 'I am requesting a change of major because...'
};

const response = await fetch('/api/petitions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(petitionData)
});
```

### 3. Submit Petition

```javascript
const response = await fetch('/api/petitions/123/submit', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### 4. Approve Petition

```javascript
const response = await fetch('/api/approvals/123/approve', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    comments: 'Approved - all requirements met'
  })
});
```

### 5. Download PDF

```javascript
const response = await fetch('/api/pdfs/123/download', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'petition.pdf';
a.click();
```

## Frontend Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/petitions` | `PetitionsList` | List of user's petitions |
| `/petitions/new` | `NewPetition` | Create new petition |
| `/petitions/:id` | `PetitionDetail` | View petition details |
| `/approvals` | `ApprovalQueue` | Approval queue for approvers |

## Security Considerations

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: Role-based access control (RBAC) enforced
3. **Data Validation**: Input validation using `express-validator`
4. **SQL Injection Prevention**: Parameterized queries throughout
5. **File Size Limits**: Signature uploads limited to 2MB
6. **Signature Security**: Only base64-encoded images accepted

## Testing

### Manual Testing Checklist

- [ ] User can upload signature
- [ ] User can create petition draft
- [ ] User can submit petition with signature
- [ ] Approver sees petition in queue
- [ ] Approver can approve petition
- [ ] Approver can reject petition
- [ ] Approver can return petition
- [ ] Student can resubmit returned petition
- [ ] PDF is generated with signatures
- [ ] PDF can be downloaded
- [ ] All approval steps tracked correctly
- [ ] Audit log captures all actions

### Test Accounts

You'll need to set up test accounts with different roles:
- Student (basicuser role)
- Advisor (advisor role in approver_assignments)
- Chairperson (chairperson role)
- Dean (dean role)
- Provost (provost role)

## Future Enhancements

1. **Email Notifications**: Send emails when petition status changes
2. **Dashboard Statistics**: Add petition metrics to admin dashboard
3. **Bulk Operations**: Allow admins to manage multiple petitions
4. **Advanced Filtering**: More filter options on petition list
5. **Export to CSV**: Download petition data as CSV
6. **Mobile App**: Native mobile application
7. **Digital Signature Integration**: Use DocuSign or similar services
8. **Automated Reminders**: Remind approvers of pending petitions
9. **Multi-language Support**: Support for Spanish and other languages
10. **Analytics Dashboard**: Visualize petition trends and bottlenecks

## Troubleshooting

### LaTeX Not Found
If you get "pdflatex: not found" errors:
- Ensure TeX Live is installed
- Run `which pdflatex` to verify installation
- Check Dockerfile has LaTeX packages

### PDF Generation Fails
- Check LaTeX log files in `backend/latex/output/*.log`
- Verify all template placeholders are replaced
- Ensure signature images are valid

### Permission Denied
- Check file permissions on `backend/latex/` directories
- Ensure Docker user has write access
- Verify directory ownership

### Database Connection Issues
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Run migration script to create tables

## License

Copyright © 2025 Team Project. All rights reserved.

## Contact

For questions or issues, please contact the development team.
