-- Approval System Database Schema
-- Migration: 002_approval_system.sql
-- Purpose: Add tables for petition approval workflow system

-- ============================================================================
-- Table: signature_images
-- Purpose: Store user signature images for PDF generation
-- ============================================================================
CREATE TABLE IF NOT EXISTS signature_images (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_data TEXT NOT NULL, -- Base64 encoded image
    image_format VARCHAR(10) NOT NULL, -- png, jpg, svg
    file_size INTEGER NOT NULL, -- in bytes
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE -- Allow users to update signatures
);

CREATE INDEX idx_signature_images_user_id ON signature_images(user_id);
CREATE INDEX idx_signature_images_active ON signature_images(is_active) WHERE is_active = TRUE;
-- Partial unique index: Only one active signature per user
CREATE UNIQUE INDEX idx_signature_images_unique_active ON signature_images(user_id) WHERE is_active = TRUE;

-- ============================================================================
-- Table: petition_types
-- Purpose: Define available petition types from the General Petition form
-- ============================================================================
CREATE TABLE IF NOT EXISTS petition_types (
    id SERIAL PRIMARY KEY,
    type_number INTEGER NOT NULL UNIQUE, -- 1-17 from form
    type_name VARCHAR(255) NOT NULL,
    description TEXT,
    requires_explanation BOOLEAN DEFAULT FALSE,
    approval_chain JSONB NOT NULL, -- Array of required approval roles
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert the 17 petition types from the form
INSERT INTO petition_types (type_number, type_name, description, requires_explanation, approval_chain) VALUES
(1, 'Update Program Status', 'Update Student''s Program Status/action (readmit, term activate, etc.)', FALSE, '["advisor", "chairperson", "dean"]'),
(2, 'Admission Status Change', 'Change admission status', FALSE, '["advisor", "chairperson", "dean"]'),
(3, 'Add New Career', 'Add new career objective', FALSE, '["advisor", "chairperson", "dean"]'),
(4, 'Program Change', 'Student request Program Change', TRUE, '["advisor", "chairperson", "dean"]'),
(5, 'Plan/Major Change', 'Student requests plan(major) change', TRUE, '["advisor", "chairperson", "dean"]'),
(6, 'Degree Objective Change', 'Degree objective/plan change (B.A, B.S, B.B.A., etc.)', TRUE, '["advisor", "chairperson", "dean"]'),
(7, 'Requirement Term', 'Requirement Term(year) change', TRUE, '["advisor", "chairperson", "dean"]'),
(8, 'Additional Plan Request', 'Student Requests Additional Plan', TRUE, '["advisor", "chairperson", "dean"]'),
(9, 'Add Second Degree', 'Add second Degree', TRUE, '["advisor", "chairperson", "dean"]'),
(10, 'Minor Change', 'Student request removal or change of minor', TRUE, '["advisor", "chairperson", "dean"]'),
(11, 'Add Additional Minor', 'Add additional Minor', TRUE, '["advisor", "chairperson", "dean"]'),
(12, 'Degree Requirement Exception', 'Degree requirement exception', TRUE, '["advisor", "chairperson", "dean", "provost"]'),
(13, 'Special Problems Course', 'Special Problems course request', TRUE, '["advisor", "chairperson", "dean"]'),
(14, 'Course Overload', 'Course overload (indicate G.P.A., number of hours and courses)', TRUE, '["advisor", "chairperson", "dean"]'),
(15, 'Graduate Studies Leave', 'Graduate studies leave of absence', TRUE, '["advisor", "chairperson", "dean"]'),
(16, 'Graduate Studies Reinstatement', 'Graduate studies reinstatement', TRUE, '["advisor", "chairperson", "dean"]'),
(17, 'Other', 'Other petition not covered by any other form', TRUE, '["advisor", "chairperson", "dean"]');

-- ============================================================================
-- Table: petition_requests
-- Purpose: Store petition submissions and track their lifecycle
-- ============================================================================
CREATE TABLE IF NOT EXISTS petition_requests (
    id SERIAL PRIMARY KEY,

    -- Request metadata
    request_number VARCHAR(50) UNIQUE NOT NULL, -- Generated: PET-YYYYMMDD-XXXXX
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    petition_type_id INTEGER NOT NULL REFERENCES petition_types(id),

    -- Student information (from form)
    uh_number VARCHAR(50) NOT NULL,
    phone_number VARCHAR(20),
    mailing_address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),

    -- Advisor-completed fields
    current_program_plan VARCHAR(255),
    current_academic_career VARCHAR(255),
    petition_effective_before_class VARCHAR(100),
    petition_effective_after_class VARCHAR(100),

    -- Petition-specific data (flexible JSON for different petition types)
    petition_data JSONB NOT NULL, -- Stores type-specific fields
    explanation TEXT, -- Required for petitions marked with *

    -- Workflow status
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, submitted, pending, approved, rejected, returned
    current_approval_step INTEGER DEFAULT 0, -- 0=not started, 1=advisor, 2=chair, 3=dean, 4=provost

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    completed_at TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('draft', 'submitted', 'pending', 'in_review', 'approved', 'rejected', 'returned'))
);

CREATE INDEX idx_petition_requests_user_id ON petition_requests(user_id);
CREATE INDEX idx_petition_requests_status ON petition_requests(status);
CREATE INDEX idx_petition_requests_request_number ON petition_requests(request_number);
CREATE INDEX idx_petition_requests_petition_type ON petition_requests(petition_type_id);
CREATE INDEX idx_petition_requests_created_at ON petition_requests(created_at DESC);

-- ============================================================================
-- Table: approval_steps
-- Purpose: Track individual approval steps in the workflow
-- ============================================================================
CREATE TABLE IF NOT EXISTS approval_steps (
    id SERIAL PRIMARY KEY,
    petition_request_id INTEGER NOT NULL REFERENCES petition_requests(id) ON DELETE CASCADE,

    -- Approval hierarchy
    step_order INTEGER NOT NULL, -- 1=advisor, 2=chairperson, 3=dean, 4=provost
    approver_role VARCHAR(100) NOT NULL, -- advisor, chairperson, dean, provost
    approver_user_id INTEGER REFERENCES users(id), -- Assigned or actual approver

    -- Step status
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, in_review, approved, rejected, returned

    -- Approval decision
    decision VARCHAR(50), -- approved, disapproved
    comments TEXT,
    signature_image_id INTEGER REFERENCES signature_images(id),

    -- Timestamps
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    completed_at TIMESTAMP,

    CONSTRAINT valid_step_status CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'returned', 'skipped')),
    CONSTRAINT valid_decision CHECK (decision IN ('approved', 'disapproved', NULL)),
    CONSTRAINT unique_step_per_request UNIQUE (petition_request_id, step_order)
);

CREATE INDEX idx_approval_steps_petition_id ON approval_steps(petition_request_id);
CREATE INDEX idx_approval_steps_approver ON approval_steps(approver_user_id);
CREATE INDEX idx_approval_steps_status ON approval_steps(status);
CREATE INDEX idx_approval_steps_assigned_at ON approval_steps(assigned_at DESC);

-- ============================================================================
-- Table: approval_actions
-- Purpose: Audit log of all actions taken on petitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS approval_actions (
    id SERIAL PRIMARY KEY,
    petition_request_id INTEGER NOT NULL REFERENCES petition_requests(id) ON DELETE CASCADE,
    approval_step_id INTEGER REFERENCES approval_steps(id) ON DELETE SET NULL,

    -- Action details
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action_type VARCHAR(50) NOT NULL, -- created, submitted, assigned, approved, rejected, returned, commented, updated
    action_data JSONB, -- Additional action-specific data
    comments TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45), -- Support IPv6
    user_agent TEXT,

    CONSTRAINT valid_action_type CHECK (action_type IN (
        'created', 'updated', 'submitted', 'assigned',
        'approved', 'rejected', 'returned', 'commented',
        'pdf_generated', 'signature_added'
    ))
);

CREATE INDEX idx_approval_actions_petition_id ON approval_actions(petition_request_id);
CREATE INDEX idx_approval_actions_user_id ON approval_actions(user_id);
CREATE INDEX idx_approval_actions_created_at ON approval_actions(created_at DESC);
CREATE INDEX idx_approval_actions_action_type ON approval_actions(action_type);

-- ============================================================================
-- Table: stored_pdfs
-- Purpose: Store versioned PDFs at each approval step
-- ============================================================================
CREATE TABLE IF NOT EXISTS stored_pdfs (
    id SERIAL PRIMARY KEY,
    petition_request_id INTEGER NOT NULL REFERENCES petition_requests(id) ON DELETE CASCADE,
    approval_step_id INTEGER REFERENCES approval_steps(id) ON DELETE SET NULL,

    -- PDF details
    version INTEGER NOT NULL DEFAULT 1, -- Version number (increments with each approval)
    file_path TEXT NOT NULL, -- Path to stored PDF file
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL, -- in bytes
    mime_type VARCHAR(100) DEFAULT 'application/pdf',

    -- PDF generation metadata
    generated_by_user_id INTEGER REFERENCES users(id),
    generation_method VARCHAR(50) DEFAULT 'latex', -- latex, reportlab, etc.
    latex_source_path TEXT, -- Path to .tex file used for generation

    -- Status
    is_final BOOLEAN DEFAULT FALSE, -- TRUE only for fully approved petition

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_version_per_request UNIQUE (petition_request_id, version)
);

CREATE INDEX idx_stored_pdfs_petition_id ON stored_pdfs(petition_request_id);
CREATE INDEX idx_stored_pdfs_version ON stored_pdfs(petition_request_id, version);
CREATE INDEX idx_stored_pdfs_final ON stored_pdfs(is_final) WHERE is_final = TRUE;
CREATE INDEX idx_stored_pdfs_created_at ON stored_pdfs(created_at DESC);

-- ============================================================================
-- Table: approver_assignments
-- Purpose: Define which users can approve petitions in specific roles
-- ============================================================================
CREATE TABLE IF NOT EXISTS approver_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    approver_role VARCHAR(100) NOT NULL, -- advisor, chairperson, dean, provost
    department VARCHAR(255), -- For advisor/chairperson assignments
    college VARCHAR(255), -- For dean assignments
    is_active BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by_user_id INTEGER REFERENCES users(id),

    CONSTRAINT valid_approver_role CHECK (approver_role IN ('advisor', 'chairperson', 'dean', 'provost'))
);

CREATE INDEX idx_approver_assignments_user_id ON approver_assignments(user_id);
CREATE INDEX idx_approver_assignments_role ON approver_assignments(approver_role);
CREATE INDEX idx_approver_assignments_active ON approver_assignments(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for petition_requests
CREATE TRIGGER update_petition_requests_updated_at
    BEFORE UPDATE ON petition_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for petition_types
CREATE TRIGGER update_petition_types_updated_at
    BEFORE UPDATE ON petition_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate request number
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS TEXT AS $$
DECLARE
    date_part TEXT;
    sequence_part TEXT;
    max_number INTEGER;
BEGIN
    date_part := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

    -- Get the max sequence number for today
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(request_number FROM 'PET-[0-9]{8}-([0-9]{5})') AS INTEGER)
    ), 0) INTO max_number
    FROM petition_requests
    WHERE request_number LIKE 'PET-' || date_part || '-%';

    -- Increment and format as 5-digit number
    sequence_part := LPAD((max_number + 1)::TEXT, 5, '0');

    RETURN 'PET-' || date_part || '-' || sequence_part;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE signature_images IS 'Stores user signature images for PDF generation';
COMMENT ON TABLE petition_types IS 'Defines the 17 petition types from UH General Petition form';
COMMENT ON TABLE petition_requests IS 'Main table for petition submissions and lifecycle tracking';
COMMENT ON TABLE approval_steps IS 'Tracks individual approval steps in the workflow chain';
COMMENT ON TABLE approval_actions IS 'Audit log of all actions taken on petitions';
COMMENT ON TABLE stored_pdfs IS 'Stores versioned PDFs generated at each approval step';
COMMENT ON TABLE approver_assignments IS 'Defines which users can approve in specific roles';

COMMENT ON COLUMN petition_requests.petition_data IS 'Flexible JSONB field for type-specific data (e.g., from_major, to_major for type 5)';
COMMENT ON COLUMN petition_requests.status IS 'draft: not submitted | submitted: awaiting first review | pending: in approval chain | approved: all approvals received | rejected: denied by approver | returned: sent back for more info';
COMMENT ON COLUMN approval_steps.step_order IS '1=Advisor/Instructor, 2=Chairperson, 3=College Dean, 4=Sr. Vice President/Provost';
COMMENT ON COLUMN stored_pdfs.is_final IS 'TRUE only when petition has received all required approvals';
