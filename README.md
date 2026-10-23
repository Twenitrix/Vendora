# VENDORA — Enterprise Vendor Management & Procurement Platform

> **“Every vendor. Every contract. Every transaction.”**

**Vendora** is a production-grade, full-stack enterprise Vendor Management and Source-to-Pay (S2P) Procurement Platform engineered with **Java 21 + Spring Boot 3.5** and **React 19 + TypeScript + Tailwind CSS v4**. It implements all **13 core relational entities** from the supplied **Vendor Management System ER Diagram** along with complete enterprise workflows for Purchase Requisitions, Goods Receipts, 3-Way Invoice Matching, Partial/Full Payment Ledger Settlement, Multi-Factor Vendor Performance Scoring, Role-Based Access Control (RBAC), and Immutable Audit Logging.

---

## 1. Architecture & Technology Stack

### Backend (`d:\AviIP\backend`)
- **Language & Runtime**: Java 21 LTS
- **Framework**: Spring Boot 3.5.3 (`spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-security`, `spring-boot-starter-validation`)
- **Authentication & Authorization**: Stateless JWT (`jjwt 0.12.6`), BCrypt password hashing, method & endpoint RBAC across 6 enterprise roles (`SYSTEM_ADMIN`, `PROCUREMENT_ADMIN`, `PROCUREMENT_MANAGER`, `FINANCE`, `EMPLOYEE`, `VENDOR`)
- **Database & Migrations**:
  - **Flyway** (`src/main/resources/db/migration/V1__init_schema.sql`) managing all 17 relational tables, foreign keys, check constraints, and high-selectivity indexes
  - **PostgreSQL 16** support (`application-postgres.properties` + `docker-compose.yml`)
  - **Zero-Config Persistent Local Mode** (`application-local.properties`, active by default) running H2 in `MODE=PostgreSQL` persisted to `./data/vendora_db` so the platform starts immediately on any machine without requiring Docker Desktop or a local PostgreSQL service
- **API Documentation**: Springdoc OpenAPI 3 / Swagger UI (`/swagger-ui.html`, `/v3/api-docs`)
- **Testing**: JUnit 5 + Spring Boot Test + MockMvc full end-to-end integration test suite (`VendoraEnterpriseIntegrationTest`)

### Frontend (`d:\AviIP\frontend`)
- **Framework**: React 19 + TypeScript + Vite 6
- **Styling & Design System**: Tailwind CSS v4 (`@tailwindcss/vite`), custom dark-slate enterprise glassmorphic theme (`#070b14` canvas, Indigo/Cyan accents), custom reusable primitives (`Modal`, `Drawer`, `Badge`, `Button`, `KpiCard`, `EmptyState`, `Skeleton`)
- **State & Networking**: TanStack Query v5 (`@tanstack/react-query`) + Axios client with automatic JWT bearer injection and 401 session interceptor
- **Visualizations**: Recharts (`AreaChart`, `BarChart`, `PieChart`) for category spend, monthly financial velocity, and vendor status distribution
- **Testing**: Vitest unit test suite (`src/lib/utils.test.ts`)

---

## 2. Exact ER Diagram Entity Mapping (100% Coverage)

All 13 entities and every required attribute/relationship from the **Vendor Management System — ER Diagram** are implemented in `V1__init_schema.sql` and `com.vendora.entity.*`:

| # | ER Entity | Table Name | Primary Key | Key Foreign Keys & Business Rules |
|---|---|---|---|---|
| 1 | **ROLE** | `roles` | `role_id` | `role_name` (UNIQUE), `description`, `created_at` |
| 2 | **USER** | `users` | `user_id` | `role_id` → `roles(role_id)`, unique `email`, BCrypt `password` (`@JsonIgnore`), `status` |
| 3 | **VENDOR_CATEGORY** | `vendor_categories` | `category_id` | `category_name` (UNIQUE), `description`, `status` |
| 4 | **VENDOR** | `vendors` | `vendor_id` | `vendor_code` (UNIQUE), `category_id` → `vendor_categories`, `managed_by_user_id` → `users(user_id)`, `portal_user_id` → `users(user_id)` |
| 5 | **VENDOR_DOCUMENT** | `vendor_documents` | `document_id` | `vendor_id` → `vendors`, `verified_by` → `users`, `document_type`, `expiry_date`, `verification_status` |
| 6 | **CONTRACT** | `contracts` | `contract_id` | `vendor_id` → `vendors`, `title`, `start_date`, `end_date`, `contract_value`, `terms`, `status` |
| 7 | **PURCHASE_ORDER** | `purchase_orders` | `po_id` | `vendor_id` → `vendors`, `created_by` → `users`, `approved_by` → `users`, `total_amount`, `status` |
| 8 | **PURCHASE_ORDER_ITEM** | `purchase_order_items` | `po_item_id` | `po_id` → `purchase_orders`, `item_name`, `quantity`, `unit_price`, `tax_amount`, backend-computed `line_total` |
| 9 | **INVOICE** | `invoices` | `invoice_id` | `vendor_id` → `vendors`, `po_id` → `purchase_orders`, unique `(vendor_id, invoice_number)`, PO ceiling validation |
| 10 | **PAYMENT** | `payments` | `payment_id` | `invoice_id` → `invoices`, `paid_by` → `users`, `amount_paid`, `payment_method`, `transaction_ref`, auto-updates invoice `PARTIALLY_PAID`/`PAID` |
| 11 | **NOTIFICATION** | `notifications` | `notification_id` | `user_id` → `users`, `title`, `message`, `is_read`, `created_at` |
| 12 | **PERFORMANCE_REVIEW** | `performance_reviews` | `review_id` | `vendor_id` → `vendors`, `reviewed_by` → `users`, `quality_rating`, `delivery_rating`, `communication_rating`, computed `overall_rating` |
| 13 | **COMMUNICATION** | `communications` | `communication_id` | `vendor_id` → `vendors`, `user_id` → `users`, `subject`, `message`, `channel`, `sent_at` |

### Extended S2P & Governance Tables
- **`purchase_requisitions` & `purchase_requisition_items`**: Internal employee purchase requisitioning, approval, and 1-click conversion into Purchase Orders.
- **`goods_receipts`**: Delivery verification and condition inspection against issued Purchase Orders.
- **`audit_logs`**: Immutable ledger of state transitions across onboarding, contracts, POs, invoices, payments, and user governance.

---

## 3. Three Distinct Role Experiences

1. **Administrator Control Center (`SYSTEM_ADMIN`)**:
   - Full governance across all vendors, categories, compliance documents, contracts, requisitions, POs, invoices, payments, user/role provisioning (`/users`), and immutable system audit logs (`/audit-logs`).
2. **Internal Procurement & Finance Workspace (`PROCUREMENT_ADMIN`, `PROCUREMENT_MANAGER`, `FINANCE`, `EMPLOYEE`)**:
   - End-to-end vendor onboarding, compliance verification, contract lifecycle management, requisition creation/approval, PO issuance, goods receipt recording, invoice 3-way verification, and payment settlement.
3. **External Vendor Self-Service Portal (`VENDOR`)**:
   - Strict backend data isolation (`SecurityHelper.resolveScopedVendorId()`): Vendor portal users can only view/manage their own company profile, upload compliance documents, acknowledge/ship/deliver assigned Purchase Orders, submit invoices against their POs, track payment settlements, and exchange communications.

---

## 4. Demo Accounts (Seeded Automatically on Startup)

All demo accounts share the password: **`Vendora@2026`** (also available via 1-click login cards on the `/login` screen).

| Role | Email | Persona |
|---|---|---|
| `SYSTEM_ADMIN` | `admin@vendora.io` | Marcus Vance — Enterprise System Governance & Audit |
| `PROCUREMENT_ADMIN` | `procurement@vendora.io` | Elena Rostova — Vendor Onboarding, Compliance & Contracts |
| `PROCUREMENT_MANAGER` | `manager@vendora.io` | David Sterling — Procurement Approvals & Spend Oversight |
| `FINANCE` | `finance@vendora.io` | Sophia Chen — Invoice Verification & Payment Treasury |
| `EMPLOYEE` | `employee@vendora.io` | Liam O'Connor — Internal Requisitions & Order Tracking |
| `VENDOR` | `portal@apexcloud.io` | Apex Cloud Portal — Apex Cloud Systems Inc. (`VND-1001`) |
| `VENDOR` | `portal@novatech.io` | NovaTech Supplier Hub — NovaTech Precision Hardware (`VND-1002`) |

---

## 5. Running the Platform Locally

### Option A: Immediate Zero-Config Startup (Default `local` Profile)
No external database installation is required. Flyway automatically initializes the PostgreSQL-compatible database in `d:\AviIP\backend\data\vendora_db` and seeds all demo data.

1. **Start the Spring Boot Backend (Port `8080`)**:
   ```powershell
   cd d:\AviIP\backend
   .\mvnw.cmd spring-boot:run
   ```
   - Backend API Base URL: `http://localhost:8080/api/v1`
   - Swagger UI / OpenAPI 3 Docs: `http://localhost:8080/swagger-ui.html`

2. **Start the React + Vite Frontend (Port `5173`)**:
   ```powershell
   cd d:\AviIP\frontend
   npm install
   npm run dev
   ```
   - Frontend Application URL: `http://localhost:5173`

### Option B: Running with Standalone PostgreSQL 16 (`docker-compose`)
If Docker Desktop is running:
```powershell
cd d:\AviIP
docker compose up -d
cd d:\AviIP\backend
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=postgres"
```

---

## 6. Running Automated Tests & Production Builds

### Backend JUnit 5 + MockMvc Integration Suite
Tests full S2P lifecycle, backend line-item math recalculation, invoice PO ceiling enforcement, partial/full payment settlement, and `VENDOR_USER` horizontal privilege isolation:
```powershell
cd d:\AviIP\backend
.\mvnw.cmd clean test
```

### Frontend Vitest Unit Suite & Production Bundle
```powershell
cd d:\AviIP\frontend
npm run test
npm run build
```
