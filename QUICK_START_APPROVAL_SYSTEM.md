# Quick Start Guide - Approval System

This guide will help you get started with the Approval System for University of Houston General Petitions.

## Prerequisites

Before you begin, ensure you have:
- User Management System up and running
- Access to the PostgreSQL database
- LaTeX installed (for PDF generation)
- At least one user account created

## Step 1: Run Database Migration

Apply the approval system schema to your database:

```bash
# Option 1: Using psql directly
psql -h localhost -U postgres -d user_management -f database/migrations/002_approval_system.sql

# Option 2: Using Docker
docker cp database/migrations/002_approval_system.sql user_management_db:/tmp/
docker exec -it user_management_db psql -U postgres -d user_management -f /tmp/002_approval_system.sql
```

**Verify the migration:**
```sql
\dt  -- List all tables, you should see the new approval tables
SELECT * FROM petition_types;  -- Should show 17 petition types
```

## Step 2: Set Up Approver Accounts

Create test accounts with approver roles. First, create users via the UI or API, then assign them approver roles:

```sql
-- Assuming you have users with IDs 2, 3, 4, 5

-- Make user 2 an Advisor
INSERT INTO approver_assignments (user_id, approver_role, department, is_active, assigned_at)
VALUES (2, 'advisor', 'Computer Science', TRUE, NOW());

-- Make user 3 a Chairperson
INSERT INTO approver_assignments (user_id, approver_role, department, is_active, assigned_at)
VALUES (3, 'chairperson', 'Computer Science', TRUE, NOW());

-- Make user 4 a College Dean
INSERT INTO approver_assignments (user_id, approver_role, college, is_active, assigned_at)
VALUES (4, 'dean', 'College of Natural Sciences and Mathematics', TRUE, NOW());

-- Make user 5 a Provost (optional, only for degree exceptions)
INSERT INTO approver_assignments (user_id, approver_role, is_active, assigned_at)
VALUES (5, 'provost', TRUE, NOW());
```

**Verify approver assignments:**
```sql
SELECT u.name, aa.approver_role, aa.department, aa.college
FROM approver_assignments aa
JOIN users u ON aa.user_id = u.id
WHERE aa.is_active = TRUE;
```

## Step 3: Add UH Logo (Optional)

For proper PDF generation, add the UH logo:

1. Download the official UH logo from: https://uh.edu/marcom/guidelines-policies/brand-guidelines/logos/
2. Save as `uh_logo.png`
3. Place in `backend/latex/templates/`

```bash
# Example
cp ~/Downloads/uh_logo.png backend/latex/templates/
```

**Or comment out the logo in the LaTeX template** if you don't have it:
```bash
# Edit backend/latex/templates/general_petition.tex
# Comment out line with: \includegraphics[height=0.6in]{uh_logo.png}
```

## Step 4: Test the Workflow

### 4.1 As a Student

1. **Log in to the application**
   - Navigate to https://aurora.jguliz.com (or your local URL)
   - Authenticate with Office365

2. **Upload Your Signature**
   - Go to your Profile
   - Upload a signature image (PNG, JPG, or SVG, max 2MB)
   - Verify the preview looks correct

3. **Create a Change of Major Petition**
   - Click "My Petitions" in the sidebar
   - Click "New Petition"
   - Fill out the form:
     - UH Number: Your student ID
     - Current Major (From): e.g., "Computer Science"
     - New Major (To): e.g., "Data Science"
     - Explanation: Provide detailed reasoning
   - Click "Save as Draft" to save without submitting

4. **Submit the Petition**
   - Click "Submit Petition" (requires signature)
   - Confirm submission
   - Note the petition request number (e.g., PET-20250124-00001)

### 4.2 As an Advisor (First Approver)

1. **Log in as the Advisor account**

2. **Check Approval Queue**
   - Click "Approval Queue" in the sidebar
   - You should see the submitted petition

3. **Review the Petition**
   - Click on the petition to view details
   - Review student information and explanation
   - See current approval progress (Step 1 of 3 or 4)

4. **Make a Decision**
   - **Approve**: Click "Approve" → Add optional comments → Confirm
   - **Return**: Click "Return for Changes" → Add required comments → Confirm
   - **Reject**: Click "Reject" → Add required reason → Confirm

5. **Verify Status Change**
   - After approval, petition moves to next step (Chairperson)
   - Check that your signature is recorded

### 4.3 As Subsequent Approvers

Repeat the approval process for:
- **Chairperson** (Step 2)
- **College Dean** (Step 3)
- **Provost** (Step 4, if applicable)

Each approver follows the same process:
1. Check Approval Queue
2. Review petition details
3. Approve/Return/Reject

### 4.4 Back to Student - Check Status

1. **Log back in as the student**

2. **View Petition Status**
   - Go to "My Petitions"
   - Click on your petition
   - See approval progress bar
   - View which approvers have signed
   - Read any comments from approvers

3. **Download PDF**
   - Once approved by all required parties
   - Click "Download PDF"
   - Verify all signatures are present

## Step 5: Test Edge Cases

### Test Returned Petition
1. As an approver, click "Return for Changes" with a comment
2. As the student, view the returned petition
3. Click "Resubmit" to send back to the same approver
4. Approver should see it back in their queue

### Test Rejected Petition
1. As an approver, click "Reject" with a reason
2. As the student, verify the petition shows as "Rejected"
3. Note: Rejected petitions cannot be resubmitted (final state)

### Test Draft Editing
1. Create a draft petition
2. Edit the draft (change major names, explanation, etc.)
3. Submit the edited draft
4. Verify changes are reflected

## Common Issues & Solutions

### Issue: Approver doesn't see petitions in queue

**Solution:**
```sql
-- Check approver assignments
SELECT * FROM approver_assignments WHERE user_id = <your_user_id>;

-- If missing, add the assignment
INSERT INTO approver_assignments (user_id, approver_role, is_active)
VALUES (<your_user_id>, 'advisor', TRUE);
```

### Issue: PDF generation fails

**Check LaTeX installation:**
```bash
which pdflatex
pdflatex --version
```

**Check backend logs:**
```bash
docker logs user_management_backend
```

**Manual PDF test:**
```bash
cd backend/latex
make test
```

### Issue: Signature upload fails

**Check file size:**
- Must be under 2MB
- Accepted formats: PNG, JPG, SVG

**Check backend logs for validation errors:**
```bash
docker logs user_management_backend | grep signature
```

### Issue: Database connection fails

**Check database is running:**
```bash
docker ps | grep postgres
```

**Test connection:**
```bash
docker exec -it user_management_db psql -U postgres -d user_management -c "SELECT 1;"
```

## API Testing with cURL

### Upload Signature
```bash
curl -X POST https://aurora.jguliz.com/api/signatures/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageData": "base64_encoded_data_here",
    "imageFormat": "png"
  }'
```

### Create Petition
```bash
curl -X POST https://aurora.jguliz.com/api/petitions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "petitionTypeId": 5,
    "uhNumber": "1234567",
    "phoneNumber": "(713) 123-4567",
    "mailingAddress": "123 Main St",
    "city": "Houston",
    "state": "TX",
    "zip": "77004",
    "petitionData": {
      "fromMajor": "Computer Science",
      "toMajor": "Data Science"
    },
    "explanation": "I want to change my major because..."
  }'
```

### Submit Petition
```bash
curl -X POST https://aurora.jguliz.com/api/petitions/1/submit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Approve Petition
```bash
curl -X POST https://aurora.jguliz.com/api/approvals/1/approve \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "comments": "Approved - requirements met"
  }'
```

### Get Approval Queue
```bash
curl -X GET https://aurora.jguliz.com/api/approvals/my-queue \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Next Steps

1. **Review the full documentation**: [APPROVAL_SYSTEM.md](./APPROVAL_SYSTEM.md)
2. **Customize the LaTeX template**: `backend/latex/templates/general_petition.tex`
3. **Add more petition types**: Implement other forms from the 17 available types
4. **Set up email notifications**: Notify users when status changes
5. **Add analytics**: Track petition metrics and approval times

## Getting Help

If you encounter issues:

1. Check the logs:
   ```bash
   docker logs user_management_backend
   docker logs user_management_frontend
   docker logs user_management_db
   ```

2. Verify database state:
   ```sql
   -- Check petition counts
   SELECT status, COUNT(*) FROM petition_requests GROUP BY status;

   -- Check approval steps
   SELECT approver_role, status, COUNT(*) FROM approval_steps GROUP BY approver_role, status;

   -- Check recent actions
   SELECT * FROM approval_actions ORDER BY created_at DESC LIMIT 10;
   ```

3. Review the documentation:
   - [APPROVAL_SYSTEM.md](./APPROVAL_SYSTEM.md) - Full system documentation
   - [backend/latex/README.md](./backend/latex/README.md) - LaTeX/PDF documentation

4. Contact the development team

## Success Indicators

You've successfully set up the approval system when:

- ✅ Student can upload signature
- ✅ Student can create and submit petition
- ✅ Approvers see petitions in their queue
- ✅ Approvals move petition through workflow
- ✅ PDF is generated with signatures
- ✅ Audit log tracks all actions
- ✅ Status updates are reflected in real-time

Congratulations! Your approval system is ready to use. 🎉
