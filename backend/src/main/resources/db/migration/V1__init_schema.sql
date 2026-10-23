-- ==============================================================================
-- V1__init_schema.sql
-- VENDORA Enterprise Vendor Management & Procurement Platform
-- Core 13 ER Entities + Supporting Procurement Lifecycle & Audit Entities
-- ==============================================================================

-- 1. ROLE (ER Entity A)
CREATE TABLE roles (
    role_id BIGSERIAL PRIMARY KEY,
    role_name VARCHAR(60) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. USER (ER Entity B)
CREATE TABLE users (
    user_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(40),
    role_id BIGINT NOT NULL REFERENCES roles(role_id),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_status ON users(status);

-- 3. VENDOR_CATEGORY (ER Entity C)
CREATE TABLE vendor_categories (
    category_id BIGSERIAL PRIMARY KEY,
    category_name VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
);

CREATE INDEX idx_vendor_categories_status ON vendor_categories(status);

-- 4. VENDOR (ER Entity D)
CREATE TABLE vendors (
    vendor_id BIGSERIAL PRIMARY KEY,
    vendor_code VARCHAR(50) NOT NULL UNIQUE,
    company_name VARCHAR(200) NOT NULL,
    business_reg_no VARCHAR(80) NOT NULL,
    tax_id VARCHAR(80) NOT NULL,
    contact_person VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(40) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    registration_date DATE NOT NULL,
    approval_status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
    category_id BIGINT NOT NULL REFERENCES vendor_categories(category_id),
    managed_by_user_id BIGINT REFERENCES users(user_id),
    vendor_user_id BIGINT REFERENCES users(user_id),
    approval_remarks TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vendors_code ON vendors(vendor_code);
CREATE INDEX idx_vendors_category ON vendors(category_id);
CREATE INDEX idx_vendors_approval_status ON vendors(approval_status);
CREATE INDEX idx_vendors_managed_by ON vendors(managed_by_user_id);
CREATE INDEX idx_vendors_vendor_user ON vendors(vendor_user_id);

-- 5. VENDOR_DOCUMENT (ER Entity E)
CREATE TABLE vendor_documents (
    document_id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT NOT NULL REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    document_type VARCHAR(80) NOT NULL,
    original_file_name VARCHAR(255),
    file_url VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expiry_date DATE,
    verification_status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
    verification_remarks TEXT,
    verified_by BIGINT REFERENCES users(user_id),
    verified_at TIMESTAMP
);

CREATE INDEX idx_vendor_docs_vendor ON vendor_documents(vendor_id);
CREATE INDEX idx_vendor_docs_status ON vendor_documents(verification_status);
CREATE INDEX idx_vendor_docs_expiry ON vendor_documents(expiry_date);

-- 6. CONTRACT (ER Entity F)
CREATE TABLE contracts (
    contract_id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT NOT NULL REFERENCES vendors(vendor_id),
    contract_number VARCHAR(50) UNIQUE,
    title VARCHAR(200) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    contract_value NUMERIC(18, 2) NOT NULL CHECK (contract_value >= 0),
    terms TEXT NOT NULL,
    document_url VARCHAR(500),
    status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contracts_vendor ON contracts(vendor_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_end_date ON contracts(end_date);

-- 7. PURCHASE_ORDER (ER Entity G)
CREATE TABLE purchase_orders (
    po_id BIGSERIAL PRIMARY KEY,
    po_number VARCHAR(50) NOT NULL UNIQUE,
    vendor_id BIGINT NOT NULL REFERENCES vendors(vendor_id),
    created_by BIGINT NOT NULL REFERENCES users(user_id),
    approved_by BIGINT REFERENCES users(user_id),
    order_date DATE NOT NULL,
    expected_delivery_date DATE NOT NULL,
    subtotal_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    status VARCHAR(40) NOT NULL DEFAULT 'PENDING_APPROVAL',
    remarks TEXT,
    requisition_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_po_vendor ON purchase_orders(vendor_id);
CREATE INDEX idx_po_created_by ON purchase_orders(created_by);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_order_date ON purchase_orders(order_date);

-- 8. PURCHASE_ORDER_ITEM (ER Entity H)
CREATE TABLE purchase_order_items (
    po_item_id BIGSERIAL PRIMARY KEY,
    po_id BIGINT NOT NULL REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
    item_name VARCHAR(200) NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    received_quantity INTEGER NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
    unit_price NUMERIC(18, 2) NOT NULL CHECK (unit_price >= 0),
    tax_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    line_total NUMERIC(18, 2) NOT NULL CHECK (line_total >= 0)
);

CREATE INDEX idx_po_items_po ON purchase_order_items(po_id);

-- 9. INVOICE (ER Entity I)
CREATE TABLE invoices (
    invoice_id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT NOT NULL REFERENCES vendors(vendor_id),
    po_id BIGINT NOT NULL REFERENCES purchase_orders(po_id),
    invoice_number VARCHAR(80) NOT NULL UNIQUE,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal NUMERIC(18, 2) NOT NULL CHECK (subtotal >= 0),
    tax_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    total_amount NUMERIC(18, 2) NOT NULL CHECK (total_amount >= 0),
    paid_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    approval_status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
    approval_remarks TEXT,
    payment_status VARCHAR(40) NOT NULL DEFAULT 'UNPAID',
    document_url VARCHAR(500),
    verified_by BIGINT REFERENCES users(user_id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoices_vendor ON invoices(vendor_id);
CREATE INDEX idx_invoices_po ON invoices(po_id);
CREATE INDEX idx_invoices_approval_status ON invoices(approval_status);
CREATE INDEX idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- 10. PAYMENT (ER Entity J)
CREATE TABLE payments (
    payment_id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL REFERENCES invoices(invoice_id),
    paid_by BIGINT NOT NULL REFERENCES users(user_id),
    payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL,
    transaction_ref VARCHAR(120) NOT NULL UNIQUE,
    status VARCHAR(40) NOT NULL DEFAULT 'COMPLETED',
    remarks TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_paid_by ON payments(paid_by);
CREATE INDEX idx_payments_date ON payments(payment_date);

-- 11. NOTIFICATION (ER Entity K)
CREATE TABLE notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(60) NOT NULL,
    reference_id BIGINT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);

-- 12. PERFORMANCE_REVIEW (ER Entity L)
CREATE TABLE performance_reviews (
    review_id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT NOT NULL REFERENCES vendors(vendor_id),
    reviewed_by BIGINT NOT NULL REFERENCES users(user_id),
    po_id BIGINT NOT NULL REFERENCES purchase_orders(po_id),
    quality_score NUMERIC(5, 2) NOT NULL CHECK (quality_score >= 1 AND quality_score <= 5),
    delivery_score NUMERIC(5, 2) NOT NULL CHECK (delivery_score >= 1 AND delivery_score <= 5),
    communication_score NUMERIC(5, 2) NOT NULL CHECK (communication_score >= 1 AND communication_score <= 5),
    compliance_score NUMERIC(5, 2) NOT NULL CHECK (compliance_score >= 1 AND compliance_score <= 5),
    overall_score NUMERIC(5, 2) NOT NULL CHECK (overall_score >= 1 AND overall_score <= 5),
    comments TEXT,
    review_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_review_po_reviewer UNIQUE (po_id, reviewed_by)
);

CREATE INDEX idx_reviews_vendor ON performance_reviews(vendor_id);
CREATE INDEX idx_reviews_po ON performance_reviews(po_id);

-- 13. COMMUNICATION (ER Entity M)
CREATE TABLE communications (
    communication_id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT NOT NULL REFERENCES vendors(vendor_id),
    sender_id BIGINT NOT NULL REFERENCES users(user_id),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(40) NOT NULL DEFAULT 'SENT'
);

CREATE INDEX idx_communications_vendor ON communications(vendor_id);
CREATE INDEX idx_communications_sender ON communications(sender_id);

-- ==============================================================================
-- SUPPORTING S2P WORKFLOW & AUDIT TABLES (Section 5 & Section 15)
-- ==============================================================================

-- 14. PURCHASE_REQUISITION (Supporting S2P Workflow)
CREATE TABLE purchase_requisitions (
    requisition_id BIGSERIAL PRIMARY KEY,
    requisition_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    department VARCHAR(100) NOT NULL,
    priority VARCHAR(30) NOT NULL DEFAULT 'MEDIUM',
    needed_by DATE NOT NULL,
    category_id BIGINT NOT NULL REFERENCES vendor_categories(category_id),
    preferred_vendor_id BIGINT REFERENCES vendors(vendor_id),
    requested_by BIGINT NOT NULL REFERENCES users(user_id),
    approved_by BIGINT REFERENCES users(user_id),
    estimated_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (estimated_amount >= 0),
    status VARCHAR(40) NOT NULL DEFAULT 'PENDING_APPROVAL',
    remarks TEXT,
    generated_po_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_req_requested_by ON purchase_requisitions(requested_by);
CREATE INDEX idx_req_status ON purchase_requisitions(status);

-- 15. PURCHASE_REQUISITION_ITEM
CREATE TABLE purchase_requisition_items (
    req_item_id BIGSERIAL PRIMARY KEY,
    requisition_id BIGINT NOT NULL REFERENCES purchase_requisitions(requisition_id) ON DELETE CASCADE,
    item_name VARCHAR(200) NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    estimated_unit_price NUMERIC(18, 2) NOT NULL CHECK (estimated_unit_price >= 0),
    tax_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    line_total NUMERIC(18, 2) NOT NULL CHECK (line_total >= 0)
);

-- 16. GOODS_RECEIPT (Supporting PO Fulfillment & Receiving)
CREATE TABLE goods_receipts (
    receipt_id BIGSERIAL PRIMARY KEY,
    po_id BIGINT NOT NULL REFERENCES purchase_orders(po_id),
    received_by BIGINT NOT NULL REFERENCES users(user_id),
    received_date DATE NOT NULL,
    delivery_note_ref VARCHAR(100),
    condition_status VARCHAR(40) NOT NULL DEFAULT 'ACCEPTED',
    remarks TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 17. AUDIT_LOG (Module 15 - Immutable Enterprise Audit Trail)
CREATE TABLE audit_logs (
    audit_id BIGSERIAL PRIMARY KEY,
    actor_id BIGINT REFERENCES users(user_id),
    actor_email VARCHAR(150),
    actor_role VARCHAR(60),
    module VARCHAR(80) NOT NULL,
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id BIGINT,
    details TEXT,
    ip_address VARCHAR(60),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_module ON audit_logs(module);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
