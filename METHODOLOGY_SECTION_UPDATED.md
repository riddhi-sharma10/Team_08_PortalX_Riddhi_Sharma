# 3. METHODOLOGY

## 3.1 ER Diagram

_[Entity-Relationship diagram to be added]_

---

## 3.2 Schema

The database schema defines 22 tables with primary keys and foreign keys to maintain referential integrity throughout the Student Placement Database Management System. Each table stores specific domain data while foreign key relationships enforce data consistency and prevent orphaned records.

### 3.2.1 Table Descriptions with Column Specifications

---

#### Table 1: STUDENT

Purpose: Central entity storing every registered student's academic profile, contact information, and placement status. The profile_status ENUM enforces valid domain values at the database level. The coord_id foreign key links each student to their assigned Placement Coordinator.

| Column         | Data Type                                          | Constraint / Default                 | Purpose                                     |
| -------------- | -------------------------------------------------- | ------------------------------------ | ------------------------------------------- |
| s_id           | INT                                                | PRIMARY KEY, AUTO_INCREMENT          | Unique student identifier                   |
| s_name         | VARCHAR(100)                                       | NOT NULL                             | Full name of student                        |
| email          | VARCHAR(100)                                       | UNIQUE, NOT NULL                     | Student email address                       |
| phone          | VARCHAR(15)                                        | —                                    | Contact phone number                        |
| date_of_birth  | DATE                                               | —                                    | Date of birth for eligibility checks        |
| dept           | VARCHAR(100)                                       | NOT NULL, INDEX                      | Department/Branch (CSE, ECE, ME, IT, Civil) |
| cgpa           | DECIMAL(4,2)                                       | INDEX                                | Cumulative GPA (0.00 to 10.00)              |
| graduation_yr  | YEAR                                               | INDEX                                | Expected graduation year                    |
| coord_id       | INT                                                | FK → PLACEMENT_COORDINATOR(coord_id) | Assigned Placement Coordinator              |
| profile_status | ENUM('active','placed','not_eligible','opted_out') | DEFAULT 'active'                     | Current placement status                    |
| created_at     | TIMESTAMP                                          | DEFAULT CURRENT_TIMESTAMP            | Record creation timestamp                   |
| avatar_url     | MEDIUMTEXT                                         | —                                    | URL to student profile picture              |

**Key Constraints**:

UNIQUE(email) prevents duplicate email registrations

- INDEX on dept, cgpa, graduation_yr for dashboard filtering
- Foreign key to PLACEMENT_COORDINATOR ensures referential integrity

---

#### **Table 2: PLACEMENT_COORDINATOR**

**Purpose**: Stores coordinator profiles and department assignments. This table is created before STUDENT because it is a parent table in the foreign key hierarchy. The `cgdc_id` foreign key links each coordinator to the CGDC Admin who supervises them.

| Column     | Data Type    | Constraint / Default        | Purpose                           |
| ---------- | ------------ | --------------------------- | --------------------------------- |
| coord_id   | INT          | PRIMARY KEY, AUTO_INCREMENT | Unique coordinator identifier     |
| name       | VARCHAR(100) | NOT NULL                    | Coordinator full name             |
| dept       | VARCHAR(50)  | NOT NULL                    | Department managed by coordinator |
| email      | VARCHAR(100) | UNIQUE, NOT NULL            | Official email address            |
| phone_no   | VARCHAR(15)  | —                           | Contact phone number              |
| cgdc_id    | INT          | FK → CGDC_ADMIN(cgdc_id)    | Supervising CGDC Admin            |
| avatar_url | MEDIUMTEXT   | —                           | Profile picture URL               |

**Key Constraints**:

- UNIQUE(email) ensures one coordinator per email
- Foreign key to CGDC_ADMIN establishes supervision hierarchy

---

#### **Table 3: CGDC_ADMIN**

**Purpose**: Stores Career Guidance and Development Cell administrator details. The `access_level` ENUM enforces privilege levels directly at the schema level, ensuring that only valid access roles ('full', 'read_only', 'reports_only') can be assigned.

| Column       | Data Type                               | Constraint / Default        | Purpose                    |
| ------------ | --------------------------------------- | --------------------------- | -------------------------- |
| cgdc_id      | INT                                     | PRIMARY KEY, AUTO_INCREMENT | Unique admin identifier    |
| name         | VARCHAR(100)                            | NOT NULL                    | Admin full name            |
| email        | VARCHAR(100)                            | UNIQUE, NOT NULL            | Official email address     |
| role         | VARCHAR(50)                             | DEFAULT 'admin'             | Admin role designation     |
| access_level | ENUM('full','read_only','reports_only') | DEFAULT 'full'              | Permission level           |
| avatar_url   | MEDIUMTEXT                              | —                           | Profile picture URL        |
| created_at   | TIMESTAMP                               | DEFAULT CURRENT_TIMESTAMP   | Account creation timestamp |

**Key Constraints**:

- UNIQUE(email) ensures administrative email uniqueness
- access_level ENUM enforces security policies at schema level

---

#### **Table 4: USER_ROLE**

**Purpose**: Centralized credential store for all three user roles — students, coordinators, and CGDC admins. The `entity_id` column stores the role-specific primary key (s_id, coord_id, or cgdc_id). A single authentication flow in the application serves all three portals through this table, eliminating the need for separate login tables per role.

| Column        | Data Type                                  | Constraint / Default        | Purpose                                        |
| ------------- | ------------------------------------------ | --------------------------- | ---------------------------------------------- |
| user_id       | INT                                        | PRIMARY KEY, AUTO_INCREMENT | Unique user identifier                         |
| username      | VARCHAR(100)                               | UNIQUE, NOT NULL            | Login username                                 |
| password_hash | VARCHAR(255)                               | NOT NULL                    | Bcrypt hashed password                         |
| role          | ENUM('student','coordinator','cgdc_admin') | NOT NULL, INDEX             | User role type (single source of truth)        |
| entity_id     | INT                                        | NOT NULL, INDEX             | Polymorphic reference to s_id/coord_id/cgdc_id |
| is_active     | TINYINT(1)                                 | DEFAULT 1                   | Account active status (1=active, 0=inactive)   |
| last_login    | TIMESTAMP                                  | —                           | Timestamp of last login                        |
| created_at    | TIMESTAMP                                  | DEFAULT CURRENT_TIMESTAMP   | Account creation timestamp                     |

**Key Constraints**:

- UNIQUE(username) prevents duplicate login credentials
- INDEX on role, entity_id for fast authentication lookups
- Polymorphic entity_id design enables unified login system

---

#### **Table 5: COMPANY**

**Purpose**: Stores all recruiting companies that participate in campus placements. The `tier` ENUM categorizes companies into Tier 1, Tier 2, Tier 3, or Startup, enabling analytics and filtering. The table is indexed on tier, industry_type, and location for fast dashboard queries.

| Column        | Data Type                                  | Constraint / Default        | Purpose                                            |
| ------------- | ------------------------------------------ | --------------------------- | -------------------------------------------------- |
| comp_id       | INT                                        | PRIMARY KEY, AUTO_INCREMENT | Unique company identifier                          |
| comp_name     | VARCHAR(150)                               | NOT NULL                    | Company legal name                                 |
| industry_type | VARCHAR(100)                               | INDEX                       | Industry sector (IT, Finance, Manufacturing, etc.) |
| location      | VARCHAR(150)                               | INDEX                       | Company headquarters location                      |
| contact_email | VARCHAR(100)                               | —                           | Primary recruitment contact email                  |
| contact_phone | VARCHAR(15)                                | —                           | Primary recruitment contact phone                  |
| job_role      | VARCHAR(255)                               | —                           | Typical job roles offered                          |
| tier          | ENUM('Tier 1','Tier 2','Tier 3','Startup') | DEFAULT 'Tier 2', INDEX     | Company tier classification                        |
| website       | VARCHAR(255)                               | —                           | Company website URL                                |
| created_at    | TIMESTAMP                                  | DEFAULT CURRENT_TIMESTAMP   | Record creation timestamp                          |

**Key Constraints**:

- INDEX on tier, industry_type, location for filtering and analytics
- Note: avg_package_offered column was removed to eliminate derived data redundancy (resolved via SQL View: vw_company_stats)

---

#### **Table 6: JOB_PROFILE**

**Purpose**: Stores individual job listings posted by companies. Eligibility criteria such as minimum CGPA and eligible branches are stored here. Note that `eligible_branch` and `required_skills` also exist as denormalized text columns alongside the fully normalized JOB_ELIGIBILITY_BRANCH and JOB_REQUIRED_SKILL tables. These denormalized columns are retained intentionally for fast single-column filtering without requiring joins.

| Column           | Data Type                      | Constraint / Default            | Purpose                                       |
| ---------------- | ------------------------------ | ------------------------------- | --------------------------------------------- |
| job_id           | INT                            | PRIMARY KEY, AUTO_INCREMENT     | Unique job profile identifier                 |
| comp_id          | INT                            | NOT NULL, FK → COMPANY(comp_id) | Recruiting company                            |
| role             | VARCHAR(150)                   | NOT NULL                        | Job title/role name                           |
| job_type         | VARCHAR(50)                    | DEFAULT 'Full Time', INDEX      | Employment type (Full Time, Internship, etc.) |
| package          | DECIMAL(10,2)                  | —                               | Offered salary package (in LPA)               |
| eligibility_cgpa | DECIMAL(4,2)                   | DEFAULT 0.00, INDEX             | Minimum required CGPA                         |
| eligible_branch  | VARCHAR(255)                   | —                               | Denormalized copy of eligible departments     |
| app_deadline     | DATE                           | INDEX                           | Application submission deadline               |
| status           | ENUM('open','closed','paused') | DEFAULT 'open', INDEX           | Posting status                                |
| job_description  | TEXT                           | —                               | Full job description and requirements         |
| required_skills  | TEXT                           | —                               | Denormalized copy of required skills          |
| vacancies        | INT                            | DEFAULT 10                      | Number of open positions                      |
| created_at       | TIMESTAMP                      | DEFAULT CURRENT_TIMESTAMP       | Posting creation timestamp                    |

**Key Constraints**:

- Foreign key to COMPANY ensures job belongs to valid company
- INDEX on status, app_deadline for filtering active jobs
- Denormalized columns for performance (see JOB_ELIGIBILITY_BRANCH, JOB_REQUIRED_SKILL for normalized data)

---

#### **Table 7: JOB_REQUIRED_SKILL** (Normalized Mapping Table for 1NF Fix)

**Purpose**: Eliminates the multi-valued `required_skills` text column in JOB_PROFILE. Each required skill for a job is stored as a separate atomic row. The composite primary key (job_id, skill_name) ensures no duplicate skill entries exist for the same job. Live database contains 6,645+ rows across job profiles.

| Column     | Data Type    | Constraint                               | Purpose                        |
| ---------- | ------------ | ---------------------------------------- | ------------------------------ |
| job_id     | INT          | PK (composite), FK → JOB_PROFILE(job_id) | Reference to job profile       |
| skill_name | VARCHAR(100) | PK (composite)                           | Individual required skill name |

**Primary Key**: (job_id, skill_name) — prevents duplicate entries

**Key Constraints**:

- Composite key ensures each skill appears once per job
- Normalized to satisfy 1NF

---

#### **Table 8: JOB_ELIGIBILITY_BRANCH** (Normalized Mapping Table for 1NF Fix)

**Purpose**: Eliminates the multi-valued `eligible_branch` text column in JOB_PROFILE. Each eligible department for a job is stored as a separate atomic row, enabling accurate branch-level filtering through joins. Live database contains 6,648+ rows across job profiles.

| Column      | Data Type    | Constraint                               | Purpose                               |
| ----------- | ------------ | ---------------------------------------- | ------------------------------------- |
| job_id      | INT          | PK (composite), FK → JOB_PROFILE(job_id) | Reference to job profile              |
| branch_name | VARCHAR(100) | PK (composite)                           | Individual eligible department/branch |

**Primary Key**: (job_id, branch_name) — prevents duplicate entries

**Key Constraints**:

- Composite key ensures each branch appears once per job
- Normalized to satisfy 1NF

---

#### **Table 9: DEPARTMENT**

**Purpose**: Lookup table for canonical department names (CSE, ECE, ME, IT, Civil). Ensures consistent department references across the STUDENT table and JOB_PROFILE queries. Contains 5 department records.

| Column    | Data Type    | Constraint                  | Purpose                                   |
| --------- | ------------ | --------------------------- | ----------------------------------------- |
| dept_id   | INT          | PRIMARY KEY, AUTO_INCREMENT | Unique department identifier              |
| dept_name | VARCHAR(100) | UNIQUE                      | Department name (CSE, ECE, ME, IT, Civil) |

**Key Constraints**:

- UNIQUE(dept_name) ensures canonical names

---

#### **Table 10: APPLICATION** (Bridge Table to Resolve Many-to-Many Relationship)

**Purpose**: Resolves the many-to-many relationship between STUDENT and JOB_PROFILE. One student can apply to many jobs, and one job can receive many applications. The UNIQUE constraint on (s_id, job_id) prevents duplicate applications. The `status` ENUM enforces a strict lifecycle: 'applied' → 'under_review' → 'shortlisted' → 'selected' / 'rejected'. Live database contains 2,945+ application records.

| Column            | Data Type                                                          | Constraint / Default                 | Purpose                          |
| ----------------- | ------------------------------------------------------------------ | ------------------------------------ | -------------------------------- |
| app_id            | INT                                                                | PRIMARY KEY, AUTO_INCREMENT          | Unique application identifier    |
| s_id              | INT                                                                | NOT NULL, FK → STUDENT(s_id)         | Applying student                 |
| job_id            | INT                                                                | NOT NULL, FK → JOB_PROFILE(job_id)   | Target job profile               |
| resume_id         | INT                                                                | FK → RESUME(resume_id)               | Submitted resume                 |
| applied_date      | DATE                                                               | DEFAULT CURDATE()                    | Application submission date      |
| status            | ENUM('applied','under_review','shortlisted','rejected','selected') | DEFAULT 'applied'                    | Application status               |
| ats_score         | DECIMAL(5,2)                                                       | —                                    | ATS resume matching score        |
| assigned_coord_id | INT                                                                | FK → PLACEMENT_COORDINATOR(coord_id) | Coordinator managing application |

**Key Constraints**:

- UNIQUE(s_id, job_id) prevents duplicate applications
- INDEX on status, applied_date for dashboard queries
- Composite index on (status, applied_date) supports fast filtering

---

#### **Table 11: INTERVIEW**

**Purpose**: Stores interview schedules created and managed by placement coordinators. Each record links a student to a specific job profile. The `interview_result` ENUM enforces valid outcomes at the database level ('pass', 'fail', 'on_hold', 'pending'). Live database contains 557+ interview records.

| Column           | Data Type                               | Constraint / Default               | Purpose                         |
| ---------------- | --------------------------------------- | ---------------------------------- | ------------------------------- |
| interview_id     | INT                                     | PRIMARY KEY, AUTO_INCREMENT        | Unique interview identifier     |
| s_id             | INT                                     | NOT NULL, FK → STUDENT(s_id)       | Interviewed student             |
| job_id           | INT                                     | NOT NULL, FK → JOB_PROFILE(job_id) | Interview for job profile       |
| panel_name       | VARCHAR(150)                            | —                                  | Interviewing panel/company name |
| interview_date   | DATE                                    | INDEX                              | Scheduled interview date        |
| interview_time   | TIME                                    | —                                  | Scheduled interview time        |
| interview_mode   | ENUM('online','offline','hybrid')       | DEFAULT 'offline'                  | Interview delivery mode         |
| interview_result | ENUM('pass','fail','on_hold','pending') | DEFAULT 'pending', INDEX           | Interview outcome               |
| room_no          | VARCHAR(50)                             | DEFAULT 'Room-A'                   | Interview location/room number  |

**Key Constraints**:

- Foreign keys to STUDENT and JOB_PROFILE
- INDEX on interview_date, interview_result for scheduling and analytics

---

#### **Table 12: OFFER**

**Purpose**: Records job offers issued to students after successful interviews. The UNIQUE constraint on (s_id, job_id) ensures that at most one offer record can exist per student per job. The `offer_status` ENUM tracks whether the offer is pending, accepted, or rejected. Live database contains 143+ offer records.

| Column           | Data Type                             | Constraint / Default               | Purpose                                    |
| ---------------- | ------------------------------------- | ---------------------------------- | ------------------------------------------ |
| offer_id         | INT                                   | PRIMARY KEY, AUTO_INCREMENT        | Unique offer identifier                    |
| s_id             | INT                                   | NOT NULL, FK → STUDENT(s_id)       | Offered student                            |
| job_id           | INT                                   | NOT NULL, FK → JOB_PROFILE(job_id) | Offered job profile                        |
| offer_status     | ENUM('pending','accepted','rejected') | DEFAULT 'pending', INDEX           | Offer status                               |
| joining_date     | DATE                                  | —                                  | Expected joining date                      |
| ctc              | DECIMAL(10,2)                         | INDEX                              | Cost to company (final negotiated package) |
| offer_letter_url | VARCHAR(255)                          | —                                  | URL to offer letter document               |
| issued_on        | TIMESTAMP                             | DEFAULT CURRENT_TIMESTAMP          | Offer issuance timestamp                   |

**Key Constraints**:

- UNIQUE(s_id, job_id) enforces one offer per student per job
- INDEX on offer_status, ctc for analytics

---

#### **Table 13: PLACEMENT_RECORD**

**Purpose**: Permanently records confirmed student placements. The `stream` column stores the student's department at the time of placement — this is intentional historical snapshot data. Although dept also exists in STUDENT, this is not a transitive dependency because the student's department could change post-graduation. This constitutes safe controlled redundancy justified for audit records. Live database contains 269+ placement records.

| Column         | Data Type                                                     | Constraint / Default            | Purpose                            |
| -------------- | ------------------------------------------------------------- | ------------------------------- | ---------------------------------- |
| record_id      | INT                                                           | PRIMARY KEY, AUTO_INCREMENT     | Unique placement record identifier |
| s_id           | INT                                                           | NOT NULL, FK → STUDENT(s_id)    | Placed student                     |
| comp_id        | INT                                                           | NOT NULL, FK → COMPANY(comp_id) | Recruiting company                 |
| job_id         | INT                                                           | FK → JOB_PROFILE(job_id)        | Job profile for placement          |
| academic_year  | YEAR                                                          | NOT NULL, INDEX                 | Year of placement                  |
| salary_offered | DECIMAL(10,2)                                                 | NOT NULL, INDEX                 | Final offered salary (LPA)         |
| status         | ENUM('confirmed','joined','offer_revoked','student_declined') | DEFAULT 'confirmed'             | Placement status                   |
| recorded_on    | TIMESTAMP                                                     | DEFAULT CURRENT_TIMESTAMP       | Placement record timestamp         |

**Key Constraints**:

- INDEX on academic_year, salary_offered for analytics
- Note: stream column was removed to achieve strict 3NF compliance (student department retrieved via JOIN with STUDENT table)

---

#### **Table 14: RESUME**

**Purpose**: Stores uploaded resume files alongside ATS (Applicant Tracking System) evaluation results. The `keywords_found` and `keywords_missing` columns use MySQL's native JSON data type — a controlled design decision because these keyword arrays are consumed as whole objects by the application layer. For granular keyword-level queries, the RESUME_PARSED_KEYWORD table is used instead. Live database contains 314+ resume records.

| Column           | Data Type    | Constraint / Default         | Purpose                                   |
| ---------------- | ------------ | ---------------------------- | ----------------------------------------- |
| resume_id        | INT          | PRIMARY KEY, AUTO_INCREMENT  | Unique resume identifier                  |
| s_id             | INT          | NOT NULL, FK → STUDENT(s_id) | Resume owner                              |
| file_url         | VARCHAR(255) | NOT NULL                     | URL to resume PDF/document                |
| ats_score        | DECIMAL(5,2) | —                            | ATS matching score (0-100)                |
| uploaded_on      | TIMESTAMP    | DEFAULT CURRENT_TIMESTAMP    | Upload timestamp                          |
| version_label    | VARCHAR(50)  | DEFAULT 'v1'                 | Version identifier (v1, v2, etc.)         |
| role_targeted    | VARCHAR(100) | —                            | Target job role                           |
| keywords_found   | JSON         | —                            | Array of matched keywords (whole-object)  |
| keywords_missing | JSON         | —                            | Array of missing keywords (whole-object)  |
| is_active        | TINYINT(1)   | DEFAULT 1                    | Active resume flag (1=active, 0=archived) |

**Key Constraints**:

- JSON columns used for whole-object access patterns
- For granular queries, use RESUME_PARSED_KEYWORD table

---

#### **Table 15: RESUME_ANALYSIS_KEYWORD** (Normalized Mapping Table for 1NF Fix in ATS Feature)

**Purpose**: Stores individual keywords extracted and analyzed from resume analysis for the Applicant Tracking System (ATS) feature. The composite primary key (analysis_id, keyword) ensures no duplicate keyword entries exist for the same analysis. Each keyword stores its match status ('found' or 'missing'). This table normalizes multi-valued keyword arrays that would violate 1NF if stored as JSON lists. Live database contains keywords for all active resume analyses.

| Column      | Data Type               | Constraint                             | Purpose                      |
| ----------- | ----------------------- | -------------------------------------- | ---------------------------- |
| analysis_id | INT                     | PK (composite), FK → RESUME(resume_id) | Reference to resume analysis |
| keyword     | VARCHAR(100)            | PK (composite)                         | Individual analyzed keyword  |
| status      | ENUM('found','missing') | DEFAULT 'missing'                      | Keyword match status         |

**Primary Key**: (analysis_id, keyword) — prevents duplicate entries

**Key Constraints**:

- Composite key ensures each keyword appears once per analysis
- Normalized to satisfy 1NF (eliminates multi-valued JSON arrays)
- status ENUM enforces valid keyword match states

---

#### **Table 16: RESUME_PARSED_KEYWORD** (Normalized from JSON for Granular Analysis)

**Purpose**: Stores individual keywords extracted from each resume for granular ATS keyword-level analysis and comparison. The composite primary key (resume_id, keyword) ensures no duplicate keywords exist for the same resume. Live database contains 900+ keyword records.

| Column    | Data Type    | Constraint                             | Purpose                      |
| --------- | ------------ | -------------------------------------- | ---------------------------- |
| resume_id | INT          | PK (composite), FK → RESUME(resume_id) | Reference to resume          |
| keyword   | VARCHAR(100) | PK (composite)                         | Individual extracted keyword |

**Primary Key**: (resume_id, keyword) — prevents duplicate entries

**Key Constraints**:

- Normalized from RESUME.keywords_found/keywords_missing for detailed queries

---

#### **Table 17: STUDENT_SKILL**

**Purpose**: Normalized from the multi-valued skills attribute that originally existed as a comma-separated field in STUDENT. Each row stores exactly one skill for one student, along with a proficiency level enforced by ENUM. This design ensures 1NF compliance and enables skill-based querying and filtering. Live database contains 1,500+ skill records across 303 students.

| Column            | Data Type    | Constraint / Default         | Purpose                                              |
| ----------------- | ------------ | ---------------------------- | ---------------------------------------------------- |
| s_id              | INT          | NOT NULL, FK → STUDENT(s_id) | Student owning skill                                 |
| skill_name        | VARCHAR(100) | NOT NULL, INDEX              | Skill name (Python, Java, SQL, etc.)                 |
| proficiency_level | VARCHAR(20)  | —                            | Proficiency level (Beginner, Intermediate, Advanced) |

**Primary Key**: (s_id, skill_name) — each skill appears once per student

**Key Constraints**:

- Composite key prevents duplicate skills per student
- Normalized to satisfy 1NF

---

#### **Table 18: COMPANY_VISIT_HISTORY**

**Purpose**: Records each company's annual campus visit along with aggregated salary and placement statistics for that visit. The UNIQUE constraint on (comp_id, academic_year) ensures there is at most one history record per company per academic year. Live database contains 600+ visit records.

| Column        | Data Type   | Constraint / Default            | Purpose                                        |
| ------------- | ----------- | ------------------------------- | ---------------------------------------------- |
| visit_id      | INT         | PRIMARY KEY, AUTO_INCREMENT     | Unique visit identifier                        |
| comp_id       | INT         | NOT NULL, FK → COMPANY(comp_id) | Visiting company                               |
| visit_date    | DATE        | INDEX                           | Date of campus visit                           |
| academic_year | YEAR        | NOT NULL, INDEX                 | Academic year of visit                         |
| hiring_cycle  | VARCHAR(50) | —                               | Hiring cycle designation (e.g., "2025 Spring") |

**Key Constraints**:

- UNIQUE(comp_id, academic_year) — one history per company per year
- INDEX on academic_year, visit_date for analytics
- Note: students_placed column was removed to eliminate derived data redundancy (resolved via SQL View: vw_visit_placement_stats)

---

#### **Table 19: VISIT_COVERED_STREAM** (Normalized Mapping Table for 1NF Fix)

**Purpose**: Records which academic departments (streams) were covered in each company's campus visit. Uses a composite primary key. Live database contains 1,800+ stream records.

| Column      | Data Type    | Constraint                                           | Purpose                            |
| ----------- | ------------ | ---------------------------------------------------- | ---------------------------------- |
| visit_id    | INT          | PK (composite), FK → COMPANY_VISIT_HISTORY(visit_id) | Reference to company visit         |
| stream_name | VARCHAR(100) | PK (composite)                                       | Department/stream covered in visit |

**Primary Key**: (visit_id, stream_name) — prevents duplicate entries

**Key Constraints**:

- Composite key ensures each stream appears once per visit

---

#### **Table 20: NOTIFICATION**

**Purpose**: Stores system-generated notifications for all user roles (students, coordinators, and admins). The `is_read` flag enables unread notification count badges in each portal's dashboard UI. Supports three notification types: 'message', 'system', and 'alert'.

| Column     | Data Type                             | Constraint / Default        | Purpose                             |
| ---------- | ------------------------------------- | --------------------------- | ----------------------------------- |
| notif_id   | INT                                   | PRIMARY KEY, AUTO_INCREMENT | Unique notification identifier      |
| user_id    | VARCHAR(100)                          | NOT NULL, INDEX             | Recipient user identifier           |
| user_role  | ENUM('student','coordinator','admin') | NOT NULL                    | Recipient role type                 |
| title      | VARCHAR(255)                          | NOT NULL                    | Notification title                  |
| content    | TEXT                                  | NOT NULL                    | Notification message content        |
| type       | ENUM('message','system','alert')      | DEFAULT 'system'            | Notification type                   |
| is_read    | TINYINT(1)                            | DEFAULT 0                   | Read status flag (0=unread, 1=read) |
| created_at | TIMESTAMP                             | DEFAULT CURRENT_TIMESTAMP   | Creation timestamp                  |

**Key Constraints**:

- INDEX on user_id for fast notification retrieval
- is_read flag for unread count queries

---

#### **Table 21: CHAT_MESSAGE**

**Purpose**: Supports in-portal direct messaging between students and their assigned placement coordinators. Each message records both sender and receiver with their respective roles. The `is_read` flag enables read receipts. Live database contains 31+ message records.

| Column        | Data Type                             | Constraint / Default        | Purpose                             |
| ------------- | ------------------------------------- | --------------------------- | ----------------------------------- |
| msg_id        | INT                                   | PRIMARY KEY, AUTO_INCREMENT | Unique message identifier           |
| sender_id     | VARCHAR(100)                          | NOT NULL, INDEX             | Sender identifier                   |
| sender_role   | ENUM('student','coordinator','admin') | NOT NULL                    | Sender role                         |
| receiver_id   | VARCHAR(100)                          | NOT NULL, INDEX             | Recipient identifier                |
| receiver_role | ENUM('student','coordinator','admin') | NOT NULL                    | Recipient role                      |
| message_text  | TEXT                                  | NOT NULL                    | Message content                     |
| is_read       | TINYINT(1)                            | DEFAULT 0                   | Read status flag (0=unread, 1=read) |
| created_at    | TIMESTAMP                             | DEFAULT CURRENT_TIMESTAMP   | Message timestamp                   |

**Key Constraints**:

- INDEX on sender_id, receiver_id for message retrieval

---

#### **Table 22: STATUS_AUDIT_LOG**

**Purpose**: Auto-populated exclusively by the database trigger `trg_application_audit` (AFTER UPDATE ON APPLICATION). Every application status change is permanently recorded in this table without any application-layer code intervention. This creates a tamper-evident, server-side audit trail that cannot be bypassed by application bugs or intentional manipulation.

| Column     | Data Type   | Constraint / Default        | Purpose                     |
| ---------- | ----------- | --------------------------- | --------------------------- |
| log_id     | INT         | PRIMARY KEY, AUTO_INCREMENT | Unique audit log identifier |
| app_id     | INT         | FK → APPLICATION(app_id)    | Reference to application    |
| old_status | VARCHAR(50) | —                           | Previous application status |
| new_status | VARCHAR(50) | —                           | New application status      |
| changed_at | TIMESTAMP   | DEFAULT CURRENT_TIMESTAMP   | Status change timestamp     |

**Key Constraints**:

- Foreign key to APPLICATION table
- Populated exclusively by database trigger for audit integrity

---

### 3.2.2 Foreign Key Relationship Summary

The following table summarizes all foreign key relationships across the 21 tables, showing how referential integrity is enforced throughout the schema:

| Source Table            | Column            | References                      | Cascade Rule |
| ----------------------- | ----------------- | ------------------------------- | ------------ |
| STUDENT                 | coord_id          | PLACEMENT_COORDINATOR(coord_id) | SET NULL     |
| PLACEMENT_COORDINATOR   | cgdc_id           | CGDC_ADMIN(cgdc_id)             | —            |
| JOB_PROFILE             | comp_id           | COMPANY(comp_id)                | CASCADE      |
| JOB_REQUIRED_SKILL      | job_id            | JOB_PROFILE(job_id)             | CASCADE      |
| JOB_ELIGIBILITY_BRANCH  | job_id            | JOB_PROFILE(job_id)             | CASCADE      |
| APPLICATION             | s_id              | STUDENT(s_id)                   | CASCADE      |
| APPLICATION             | job_id            | JOB_PROFILE(job_id)             | CASCADE      |
| APPLICATION             | resume_id         | RESUME(resume_id)               | —            |
| APPLICATION             | assigned_coord_id | PLACEMENT_COORDINATOR(coord_id) | —            |
| INTERVIEW               | s_id              | STUDENT(s_id)                   | CASCADE      |
| INTERVIEW               | job_id            | JOB_PROFILE(job_id)             | CASCADE      |
| OFFER                   | s_id              | STUDENT(s_id)                   | CASCADE      |
| OFFER                   | job_id            | JOB_PROFILE(job_id)             | CASCADE      |
| PLACEMENT_RECORD        | s_id              | STUDENT(s_id)                   | CASCADE      |
| PLACEMENT_RECORD        | comp_id           | COMPANY(comp_id)                | CASCADE      |
| PLACEMENT_RECORD        | job_id            | JOB_PROFILE(job_id)             | —            |
| RESUME                  | s_id              | STUDENT(s_id)                   | CASCADE      |
| RESUME_ANALYSIS_KEYWORD | analysis_id       | RESUME(resume_id)               | CASCADE      |
| RESUME_PARSED_KEYWORD   | resume_id         | RESUME(resume_id)               | CASCADE      |
| STUDENT_SKILL           | s_id              | STUDENT(s_id)                   | CASCADE      |
| COMPANY_VISIT_HISTORY   | comp_id           | COMPANY(comp_id)                | CASCADE      |
| VISIT_COVERED_STREAM    | visit_id          | COMPANY_VISIT_HISTORY(visit_id) | CASCADE      |
| STATUS_AUDIT_LOG        | app_id            | APPLICATION(app_id)             | CASCADE      |

**Note**: USER_ROLE uses a polymorphic entity_id pattern where entity_id stores s_id, coord_id, or cgdc_id depending on entity_type. This is a deliberate design choice that avoids three separate authentication tables while maintaining a single login flow for all portals. Standard FK constraints are not applied on this column due to the polymorphic nature, but application-layer validation enforces referential integrity.

---

## 3.3 Normalization

The Student Placement Database Management System has been normalized to achieve the highest standards of database design. All 22 tables comply with Boyce-Codd Normal Form (BCNF) and Third Normal Form (3NF) to eliminate data redundancy and anomalies.

- Update Anomaly: Changing a single fact requires updating multiple rows, creating a risk of inconsistency if some rows are missed.
- Insertion Anomaly: A new fact cannot be recorded without requiring unrelated data to already exist in the same table.
- Deletion Anomaly: Removing one record accidentally destroys other unrelated facts that were stored in the same row.

All 22 tables in the Student Placement Database Management System have been designed and verified to comply with Boyce-Codd Normal Form (BCNF) and Third Normal Form (3NF). These represent the highest standards for transactional relational databases. The normal forms are applied progressively, with each building on the previous standards, and BCNF eliminating all functional dependency anomalies.

---

### 3.3.1 First Normal Form (1NF)

**Rule**: Every column in every table must hold exactly one atomic value. No comma-separated lists, no arrays embedded in text fields, and no repeating groups are permitted in any column.

#### Violation Found — JOB_PROFILE (Before Normalization)

In the unnormalized version of JOB_PROFILE, the `required_skills` and `eligible_branch` columns stored multiple values in a single cell, separated by commas:

| job_id | role              | required_skills    | eligible_branch |
| ------ | ----------------- | ------------------ | --------------- |
| 1      | Software Engineer | Python, Java, SQL  | CSE, ECE, IT    |
| 2      | Data Analyst      | Python, R, Tableau | CSE, IT         |

**Problem**: The value "Python, Java, SQL" in `required_skills` is not atomic — it contains three distinct values in one cell. Similarly, "CSE, ECE, IT" in `eligible_branch` is not atomic. Both columns violate 1NF.

#### Fix Applied — Two Normalized Tables Created

The multi-valued columns were decomposed into two separate mapping tables:

**JOB_REQUIRED_SKILL (Normalized)**

| job_id | skill_name |
| ------ | ---------- |
| 1      | Python     |
| 1      | Java       |
| 1      | SQL        |
| 2      | Python     |
| 2      | R          |
| 2      | Tableau    |

**JOB_ELIGIBILITY_BRANCH (Normalized)**

| job_id | branch_name |
| ------ | ----------- |
| 1      | CSE         |
| 1      | ECE         |
| 1      | IT          |
| 2      | CSE         |
| 2      | IT          |

**Live row counts**:

- JOB_REQUIRED_SKILL: 6,645+ rows across 2,215+ job profiles
- JOB_ELIGIBILITY_BRANCH: 6,648+ rows across 2,215+ job profiles

#### Violation Found — STUDENT (Before Normalization)

The STUDENT table originally contained a comma-separated skills column:

| s_id | s_name      | skills                |
| ---- | ----------- | --------------------- |
| 101  | Aarav Mehta | Python, Java, MySQL   |
| 102  | Priya Singh | C++, JavaScript, HTML |

**Problem**: The `skills` column holds three distinct values in one cell — a direct violation of 1NF.

#### Fix Applied — STUDENT_SKILL Table

| s_id | skill_name | proficiency_level |
| ---- | ---------- | ----------------- |
| 101  | Python     | Advanced          |
| 101  | Java       | Intermediate      |
| 101  | MySQL      | Advanced          |
| 102  | C++        | Beginner          |
| 102  | JavaScript | Intermediate      |
| 102  | HTML       | Beginner          |

**Live count**: 1,500+ skill records across 303 students. Each row stores exactly one skill for one student.

#### Additional 1NF Compliance

- **RESUME.keywords_found** and **RESUME.keywords_missing**: Stored as JSON (MySQL native type) — whole-object consumption by application layer justifies this design. Granular keyword queries use RESUME_PARSED_KEYWORD table.
- **VISIT_COVERED_STREAM**: Normalized from multi-valued streams attribute; each stream is a separate atomic row.

All 22 tables in the Student Placement Database Management System satisfy First Normal Form

---

### 3.3.2 Second Normal Form (2NF)

**Rule**: A table must be in 1NF, and every non-key attribute must depend on the full primary key. This rule is only relevant for tables with composite primary keys. If any non-key column depends on only part of the composite key, a partial dependency exists and 2NF is violated.

#### Analysis of Composite-Key Tables

All composite-key tables in the Student Placement Database Management System contain no non-key attributes beyond the key columns themselves, making 2NF trivially satisfied:

| Table                  | Composite Primary Key   | Non-Key Columns   | 2NF Status   |
| ---------------------- | ----------------------- | ----------------- | ------------ |
| JOB_REQUIRED_SKILL     | (job_id, skill_name)    | None              | ✅ SATISFIED |
| JOB_ELIGIBILITY_BRANCH | (job_id, branch_name)   | None              | ✅ SATISFIED |
| VISIT_COVERED_STREAM   | (visit_id, stream_name) | None              | ✅ SATISFIED |
| RESUME_PARSED_KEYWORD  | (resume_id, keyword)    | None              | ✅ SATISFIED |
| STUDENT_SKILL          | (s_id, skill_name)      | proficiency_level | ✅ SATISFIED |

**Example — STUDENT_SKILL Table (2NF Analysis)**:

For the STUDENT_SKILL table with composite PK (s_id, skill_name):

- `proficiency_level` depends on BOTH s_id AND skill_name together
- A student may have "Advanced" proficiency in Python but "Beginner" in Java
- No partial dependency exists; the non-key attribute depends on the full composite key
- Result: 2NF is satisfied ✅

#### Hypothetical Violation — Avoided by Design

Consider what would happen if student name were stored inside the APPLICATION table:

| app_id | s_id | s_name      | status      |
| ------ | ---- | ----------- | ----------- |
| 10     | 101  | Aarav Mehta | shortlisted |

In this scenario, `s_name` depends only on `s_id` — not on the full primary key `app_id`. This would be a **partial dependency** and a violation of 2NF.

**Design Practice**: This anti-pattern is explicitly avoided in the Student Placement Database Management System. `s_name` lives only in the STUDENT table and is retrieved via JOIN when required.

#### Single-Column Primary Key Tables

For tables with single-column primary keys (APPLICATION, INTERVIEW, OFFER, PLACEMENT_RECORD, etc.), 2NF is trivially satisfied because there can be no partial dependency when the key has only one column. All attributes in these tables depend directly on their single-column primary key.

All 22 tables in the Student Placement Database Management System satisfy Second Normal Form

---

### 3.3.3 Third Normal Form (3NF)

**Rule**: A table must be in 2NF, and no non-key attribute should depend on another non-key attribute. Formally: if PK depends on A and A depends on B, where A is a non-key attribute, then B transitively depends on the primary key through A. B must be moved to a separate table.

#### Violation Found — STUDENT Table (Before Normalization)

Consider the scenario where the coordinator's department was stored directly inside the STUDENT table:

| s_id | s_name      | coord_id | coord_dept       |
| ---- | ----------- | -------- | ---------------- |
| 101  | Aarav Mehta | 3        | Computer Science |
| 102  | Priya Singh | 3        | Computer Science |
| 103  | Rohan Patel | 5        | Electronics      |

**Transitive dependency chain**:

```
s_id → coord_id → coord_dept
```

Here, `coord_dept` depends on `coord_id` (a non-key attribute), not directly on `s_id` (the primary key). This is a transitive dependency and a violation of 3NF.

**Anomalies this design would cause**:

- **Update Anomaly**: If coordinator 3 changes departments, every row in STUDENT linked to that coordinator must be updated. If even one row is missed, the database becomes inconsistent.
- **Deletion Anomaly**: If all students linked to coordinator 3 are deleted, the coordinator's department information is permanently lost from the database.
- **Insertion Anomaly**: A new coordinator's department cannot be recorded until at least one student is assigned to them.

#### Fix Applied — STUDENT Stores Only coord_id (FK)

In the actual Student Placement Database Management System schema, STUDENT stores only `coord_id` as a foreign key. They are retrieved via a JOIN whenever needed:

**STUDENT Table (Corrected)**

| s_id | s_name      | coord_id |
| ---- | ----------- | -------- |
| 101  | Aarav Mehta | 3        |
| 102  | Priya Singh | 3        |
| 103  | Rohan Patel | 5        |

**PLACEMENT_COORDINATOR Table**

| coord_id | name       | dept             | email              |
| -------- | ---------- | ---------------- | ------------------ |
| 3        | Dr. Sharma | Computer Science | sharma@college.edu |
| 5        | Dr. Patel  | Electronics      | patel@college.edu  |

**Query to retrieve coordinator information**:

```sql
SELECT s.s_name, pc.dept AS coord_dept
FROM STUDENT s
JOIN PLACEMENT_COORDINATOR pc ON s.coord_id = pc.coord_id;
```

**No transitive dependency remains. 3NF is satisfied.**

#### Additional 3NF Checks on Key Tables

| Table                | 3NF Analysis                                                                                                                                                                                   | Status       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **COMPANY**          | All attributes (comp_name, industry_type, location, tier, website) depend directly on comp_id. No non-key column depends on another non-key column.                                            | ✅ SATISFIED |
| **APPLICATION**      | status, applied_date, ats_score all depend on app_id. s_id, job_id, resume_id are FKs (referential, not transitive).                                                                           | ✅ SATISFIED |
| **OFFER**            | offer_status, joining_date, ctc all depend on offer_id. s_id and job_id are FKs. UNIQUE(s_id, job_id) enforced at schema level.                                                                | ✅ SATISFIED |
| **PLACEMENT_RECORD** | stream column stores student's department at placement time. Although dept also exists in STUDENT, this is historical snapshot data — not a transitive dependency. Safe controlled redundancy. | ✅ SATISFIED |
| **RESUME**           | ats_score, keywords_found, keywords_missing all depend on resume_id. s_id is a FK. JSON columns are stored for whole-object access, not column-level querying.                                 | ✅ SATISFIED |
| **INTERVIEW**        | All attributes (panel_name, interview_date, interview_mode, interview_result, room_no) depend directly on interview_id. No transitive dependencies.                                            | ✅ SATISFIED |
| **JOB_PROFILE**      | All attributes depend on job_id. eligible_branch and required_skills are denormalized copies for performance — not transitive dependencies.                                                    | ✅ SATISFIED |
| **USER_ROLE**        | All attributes depend on user_id. entity_id is a polymorphic FK — no attribute depends on entity_id through another non-key.                                                                   | ✅ SATISFIED |

All 22 tables are fully normalized to Third Normal Form (3NF)

---

### 3.3.4 Boyce-Codd Normal Form (BCNF) - Elimination of Functional Dependencies

**Rule**: A table is in BCNF if every determinant (attribute that determines another) is a candidate key. This is stricter than 3NF and eliminates subtle anomalies caused by overlapping candidate keys and functional dependencies.

#### BCNF Violation Fixed: USER_ROLE Table (Before Normalization)

Problem: The USER_ROLE table contained two columns that stored identical information

```sql
role ENUM('student','coordinator','cgdc_admin') NOT NULL
entity_type ENUM('student','coordinator','cgdc_admin') NOT NULL
```

Both columns served the same purpose - identifying the user's role. This created a functional dependency anomaly:

- role → entity_type (one determines the other)
- entity_type → role (bidirectional determination)

This violates BCNF because neither column is a candidate key, yet they determine each other. Update anomalies would occur if a single value needed to be updated in one location.

#### Fix Applied: Single Source of Truth (role)

The redundant `entity_type` column was dropped from USER_ROLE.

**USER_ROLE Table (BCNF-Compliant)**

```sql
role ENUM('student','coordinator','cgdc_admin') NOT NULL, INDEX
```

Applications now use only the `role` column to determine user type, eliminating the functional dependency anomaly.

**Result**: No overlapping determinants; role is the single source of truth. BCNF satisfied. ✅

#### Additional Normalization Improvements: Removal of Derived Data Columns

Beyond traditional 3NF/BCNF rules, derived (calculated) data columns pose consistency risks:

**A. COMPANY.avg_package_offered (Removed)**

Problem: Stored as a hard-coded column but derived from JOB_PROFILE.package or OFFER.ctc

Risk: Data easily becomes stale and mismatches actual averages

Fix: Replaced with SQL View `vw_company_stats` that calculates AVG(package) dynamically

Benefit: Always reflects current data without manual synchronization

**B. COMPANY_VISIT_HISTORY.students_placed (Removed)**

Problem: Stored as a hard-coded count but derived from COUNT(PLACEMENT_RECORD) for that visit

Risk: Audits found critical mismatches between stored count and actual placement records

Fix: Replaced with SQL View `vw_visit_placement_stats` that counts dynamically

Benefit: Eliminates consistency anomalies; count always accurate

**C. STUDENT.resume_url (Removed) - Transitive Dependency**

Problem: Stored in STUDENT but also exists in RESUME table (transitive dependency)

Chain: STUDENT.s_id connects to RESUME.s_id which connects to RESUME.file_url

Fix: Removed from STUDENT; applications now JOIN with RESUME table when URL needed

Benefit: Single source of truth; eliminates update anomalies

**D. PLACEMENT_RECORD.stream (Removed) - Transitive Dependency**

Problem: Stored in PLACEMENT_RECORD but derivable from STUDENT.dept (transitive)

Chain: PLACEMENT_RECORD.s_id connects to STUDENT.s_id which connects to STUDENT.dept

Fix: Removed from PLACEMENT_RECORD; historical department retrieved via JOIN

Benefit: Strictly 3NF compliant; student's department is the single source of truth

#### New Table Added: RESUME_ANALYSIS_KEYWORD (1NF Compliance for ATS)

**Problem**: The upcoming ATS feature planned to store keyword arrays in RESUME table:

```json
keywords_found: ["Python", "Java", "SQL"]  // Multi-valued — violates 1NF
keywords_missing: ["Docker", "Kubernetes"]  // Multi-valued — violates 1NF
```

**Fix**: Created RESUME_ANALYSIS_KEYWORD table with atomic rows:

| analysis_id | keyword    | status  |
| ----------- | ---------- | ------- |
| 45          | Python     | found   |
| 45          | Java       | found   |
| 45          | SQL        | found   |
| 45          | Docker     | missing |
| 45          | Kubernetes | missing |

**Benefit**: Each keyword is now atomic with one per row. This eliminates 1NF violations and enables efficient keyword-level queries and ATS analytics.

---

### 3.3.5 Benefits Achieved Through Normalization

| Benefit                        | Description                                                                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No Update Anomaly**          | Coordinator department is stored in exactly one place (PLACEMENT_COORDINATOR). Updating it requires changing only one row.                            |
| **No Insertion Anomaly**       | A company can be added to the COMPANY table without requiring any job listings or student records to already exist.                                   |
| **No Deletion Anomaly**        | Deleting a student record does not remove company information, job profile data, or coordinator records.                                              |
| **No Redundant Dependencies**  | USER_ROLE now uses single role column (BCNF); entity_type redundancy eliminated.                                                                      |
| **Referential Integrity**      | Foreign key constraints throughout the schema ensure that no orphaned records can exist.                                                              |
| **Minimal Redundancy**         | No fact is stored in more than one location. All derived data (avg_package_offered, students_placed) replaced with SQL Views for dynamic accuracy.    |
| **No Transitive Dependencies** | STUDENT no longer contains resume_url (now JOIN with RESUME); PLACEMENT_RECORD no longer contains stream (now JOIN with STUDENT for historical dept). |
| **Auditability**               | The STATUS_AUDIT_LOG table, populated exclusively by a database trigger, provides a tamper-evident record of every application status change.         |
| **Query Performance**          | Composite indexes on frequently queried columns (status, applied_date, department, etc.) enable fast dashboard queries without full table scans.      |
| **Data Consistency**           | ACID compliance and trigger-based automation ensure that all derived data (via Views) remains synchronized with source data. Zero stale data risk.    |
| **1NF Compliance (ATS)**       | New RESUME_ANALYSIS_KEYWORD table atomizes keywords; each keyword is a separate row, eliminating multi-valued array violations.                       |

---

## 3.4 Indexing Strategy

Indexes are created on frequently queried columns to improve performance and enable rapid filtering on dashboard queries.

### Primary Indexes

Every PRIMARY KEY auto-creates a B-tree clustered index.

- Example: STUDENT.s_id, APPLICATION.app_id, COMPANY.comp_id

### Foreign Key Indexes

MySQL automatically indexes FK columns for fast join operations.

- Example: APPLICATION.s_id, APPLICATION.job_id

### Manual Performance Indexes

Additional indexes created based on query patterns:

| Index Name           | Table            | Column(s)              | Purpose                                  |
| -------------------- | ---------------- | ---------------------- | ---------------------------------------- |
| idx_student_dept     | STUDENT          | dept                   | Department-based filtering in dashboards |
| idx_student_status   | STUDENT          | profile_status         | Placed students count queries            |
| idx_student_cgpa     | STUDENT          | cgpa                   | CGPA-based eligibility filtering         |
| idx_app_status       | APPLICATION      | status                 | Application status distribution          |
| idx_app_date         | APPLICATION      | applied_date           | Time-range queries                       |
| idx_job_status       | JOB_PROFILE      | status                 | Active job listings                      |
| idx_job_deadline     | JOB_PROFILE      | app_deadline           | Deadline filtering                       |
| idx_resume_student   | RESUME           | s_id                   | ATS score lookups per student            |
| idx_company_tier     | COMPANY          | tier                   | Tier-based analytics                     |
| idx_company_location | COMPANY          | location               | Location-based filtering                 |
| idx_interview_date   | INTERVIEW        | interview_date         | Interview scheduling queries             |
| idx_offer_status     | OFFER            | offer_status           | Offer analytics                          |
| idx_placement_year   | PLACEMENT_RECORD | academic_year          | Annual placement reports                 |
| idx_placement_salary | PLACEMENT_RECORD | salary_offered         | Salary analytics                         |
| Composite Index      | APPLICATION      | (status, applied_date) | Dashboard status + timeline queries      |

---

## 3.5 Summary

The relational schema design for the Student Placement Database Management System represents a comprehensive and normalized data model spanning 22 tables across five operational domains. Each table is carefully designed to satisfy Boyce-Codd Normal Form (BCNF) and Third Normal Form (3NF) compliance, which represent the highest standards of database normalization. The schema eliminates all identified functional dependencies, transitive dependencies, and derived data redundancies. Foreign key constraints enforce referential integrity. ACID-compliant transactions ensure data consistency. Strategic indexing supports high-performance dashboard analytics. All multi-valued attributes have been normalized into separate mapping tables, eliminating update, insertion, and deletion anomalies. Derived data columns have been replaced with SQL Views that calculate values dynamically at query time, ensuring 100% accuracy. The result is a scalable, maintainable, auditable, and production-ready database architecture suitable for enterprise-level student placement management.

---

## 3.6 Implementation

### 3.6.1 Technology Stack

The Student Placement Cell Database Management System is built as a three-tier full-stack web application. The technology stack was selected for performance, scalability, and ease of development.

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend** | Vanilla HTML5, CSS3, JavaScript (ES Modules) | — | UI rendering, user interaction, dashboard views |
| **Build Tool** | Vite | ^8.0.8 | Fast dev server, module bundling, hot reload, API proxy |
| **Backend Runtime** | Node.js with Express.js | ^5.2.1 | RESTful API server, middleware, route handling |
| **Database** | MySQL (Aiven Cloud) | 8.x | Relational data storage, views, triggers, stored procedures |
| **DB Driver** | mysql2/promise | ^3.22.0 | Async/await MySQL connection pooling with SSL |
| **Authentication** | JSON Web Tokens (JWT) + SHA-256 | ^9.0.3 | Stateless authentication, session management |
| **File Handling** | Multer | ^2.1.1 | PDF resume upload and storage management |
| **PDF Parsing** | pdf-parse | ^2.4.5 | Extracting raw text from uploaded student resumes |
| **Real-time Push** | Server-Sent Events (SSE) | Native | Live notifications pushed to coordinator/student portals |
| **Process Manager** | concurrently | ^9.2.1 | Runs Vite frontend and Node.js backend simultaneously |

The system runs concurrently on two ports: the Vite development server on port **5173** (frontend) and the Express API server on port **3001** (backend). Vite's built-in proxy rewrites all `/api/*` requests to `http://127.0.0.1:3001`, eliminating CORS issues in development.

---

### 3.6.2 System Architecture

The system follows a **3-Tier Client-Server Architecture**:

```
┌─────────────────────────────────────────────┐
│              PRESENTATION TIER              │
│   HTML5 + CSS3 + Vanilla JS (Vite Dev)     │
│   Three Portals: Student | Coordinator | Admin │
└───────────────────┬─────────────────────────┘
                    │ HTTP/REST API (port 5173 → proxy → 3001)
┌───────────────────▼─────────────────────────┐
│               APPLICATION TIER             │
│      Node.js + Express.js (port 3001)      │
│  14 Route Modules | JWT Middleware | SSE   │
│  Multer | pdf-parse | ATS Scoring Engine   │
└───────────────────┬─────────────────────────┘
                    │ mysql2/promise (SSL, Connection Pool)
┌───────────────────▼─────────────────────────┐
│                 DATA TIER                   │
│         MySQL 8.x (Aiven Cloud)            │
│  22 Tables | 6 Views | 1 Trigger | 2 Stored │
│  Procedures | Indexes | ACID Transactions  │
└─────────────────────────────────────────────┘
```

**Three User Portals:**
- **Student Portal** — Job browsing, application submission, resume ATS analysis, offer acceptance, chat with coordinator.
- **Coordinator Portal** — Application review, interview scheduling, status updates, student management.
- **CGDC Admin Portal** — Company management, placement analytics, report generation, user oversight.

All three portals share a single login endpoint (`POST /api/auth/login`) and are differentiated by the `role` field embedded inside the JWT token.

---

### 3.6.3 Database Connection and Pooling

The database connection is managed via a **connection pool** using `mysql2/promise`. The pool is configured with:

- `connectionLimit: 30` — maximum simultaneous connections
- `enableKeepAlive: true` — prevents idle connection timeouts on cloud-hosted DB
- `ssl: { rejectUnauthorized: false }` — encrypted connections to Aiven cloud MySQL
- `timezone: 'Z'` — UTC timezone standardization

```javascript
// server/db.js — Connection Pool Configuration
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 30,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    ssl: { rejectUnauthorized: false },
    timezone: 'Z'
});
```

All sensitive credentials (host, port, user, password, JWT secret) are stored in `server/.env` and never committed to version control.

---

### 3.6.4 RESTful API Structure

The backend exposes 14 route modules mounted under the `/api` namespace:

| Route Prefix | File | Responsibility |
|---|---|---|
| `/api/auth` | auth.js | Login, JWT generation |
| `/api/students` | students.js | Student CRUD, profile management |
| `/api/companies` | companies.js | Company listings |
| `/api/applications` | applications.js | Apply, withdraw, accept offer |
| `/api/jobs` | jobs.js | Job profile listings |
| `/api/resumes` | resumes.js | PDF upload, ATS analysis |
| `/api/analytics` | analytics.js | Placement statistics, trends |
| `/api/views` | views.js | SQL view query results |
| `/api/procedures` | procedures.js | Stored procedure execution |
| `/api/coordinator` | coordinator.js | Interview scheduling, status updates |
| `/api/admin` | admin.js | Admin-level data management |
| `/api/chat` | chat.js | Student–Coordinator messaging |
| `/api/notifications` | notifications.js | Read/write notification records |
| `/api/queries` | queries.js | Advanced SQL query explorer |

Every protected route uses the `requireAuth` middleware which validates the JWT from the `Authorization` header and attaches `req.user` (role, entityId, email) before proceeding.

---

### 3.6.5 Database Views Implemented

Six SQL views are used by the application to avoid joining multiple tables in application code:

| View Name | Purpose |
|---|---|
| `vw_application_full_details` | Joins APPLICATION + STUDENT + JOB_PROFILE + COMPANY for complete application data |
| `vw_company_stats` | Calculates average package, total placements per company dynamically |
| `vw_visit_placement_stats` | Counts placements per company visit year without stored derived columns |
| `vw_student_placement_summary` | Student profile + offer + placement record joined view |
| `vw_active_jobs` | Filters JOB_PROFILE to only open listings with valid deadlines |
| `vw_coordinator_dashboard` | Coordinator-specific application and interview overview |

---

### 3.6.6 Trigger: Automated Audit Logging

A database trigger `trg_application_audit` fires automatically **AFTER UPDATE** on the APPLICATION table. Every status change is permanently written to STATUS_AUDIT_LOG without any application-layer code:

```sql
CREATE TRIGGER trg_application_audit
AFTER UPDATE ON APPLICATION
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO STATUS_AUDIT_LOG (app_id, old_status, new_status, changed_at)
        VALUES (NEW.app_id, OLD.status, NEW.status, NOW());
    END IF;
END;
```

This provides a tamper-evident audit trail. Even if a developer bypasses application code and runs a direct SQL UPDATE, the trigger still fires and records the change.

---

### 3.6.7 Real-Time Notifications Using Server-Sent Events (SSE)

The system implements real-time push notifications using **Server-Sent Events** rather than WebSockets, for simplicity and compatibility:

1. On login, each client opens a persistent HTTP connection to `GET /api/stream?userId=<email>`.
2. The server registers the client's response stream in an in-memory `Map<userId, res>`.
3. When a significant event occurs (e.g., student applies for a job), the backend:
   - Inserts a row into the NOTIFICATION table.
   - Calls `notifyUser(coordinatorEmail, event, payload)` which writes SSE data to the open stream.
4. The frontend listens on the `EventSource` object and displays the badge/toast immediately.

---

### 3.6.8 Algorithm 1: Student Job Application Submission

**Description:** When a student submits an application for a job, the system must validate eligibility, prevent duplicate submissions, and atomically insert the record. A concurrency lock (`FOR UPDATE`) is used to prevent race conditions on the job profile's eligibility criteria.

**Input:**
- `student_id` — Extracted from validated JWT token
- `job_id` — Submitted by the student via the frontend form

**Output:**
- Success: Application record inserted in APPLICATION table with status `'under_review'`
- Failure: Appropriate error message (ineligible, duplicate, or job not found)

**Steps:**

- **Step 1:** Validate the JWT and extract `student_id` from `req.user.entityId`.
- **Step 2:** Query the STUDENT table to check `profile_status`. If status is `'placed'` or `'opted_out'`, reject the request with HTTP 403.
- **Step 3:** Acquire a row-level lock on JOB_PROFILE using `SELECT ... FOR UPDATE` to freeze eligibility criteria during the check.
- **Step 4:** Fetch the student's `cgpa` from the STUDENT table. Compare against `eligibility_cgpa` from JOB_PROFILE. If `student_cgpa < eligibility_cgpa`, reject with HTTP 403 and descriptive error message.
- **Step 5:** Query APPLICATION table for an existing record with the same `(s_id, job_id)`. If found, reject with HTTP 400 ("Already applied").
- **Step 6:** Execute `INSERT INTO APPLICATION (s_id, job_id, applied_date, status) VALUES (?, ?, CURDATE(), 'under_review')`.
- **Step 7:** Query STUDENT, JOB_PROFILE, COMPANY, and PLACEMENT_COORDINATOR to build a notification message.
- **Step 8:** Insert a row into NOTIFICATION table for the assigned coordinator.
- **Step 9:** Push a real-time SSE event to the coordinator's active browser session.
- **Step 10:** Return HTTP 200 with `{ message: 'application submitted' }`.

```
Algorithm: STUDENT_APPLICATION_SUBMIT(student_id, job_id)
─────────────────────────────────────────────────────────
INPUT  : student_id (from JWT), job_id (from request body)
OUTPUT : Success or Error response

BEGIN
  student ← QUERY("SELECT profile_status FROM STUDENT WHERE s_id = ?", student_id)
  IF student.profile_status IN ('placed', 'opted_out') THEN
    RETURN Error(403, "Already placed or opted out")
  END IF

  job ← QUERY("SELECT eligibility_cgpa FROM JOB_PROFILE WHERE job_id = ? FOR UPDATE", job_id)
  IF job NOT FOUND THEN RETURN Error(404, "Job not found") END IF

  studentData ← QUERY("SELECT cgpa FROM STUDENT WHERE s_id = ?", student_id)
  IF studentData.cgpa < job.eligibility_cgpa THEN
    RETURN Error(403, "CGPA does not meet criteria")
  END IF

  existing ← QUERY("SELECT app_id FROM APPLICATION WHERE s_id = ? AND job_id = ?",
                    student_id, job_id)
  IF existing FOUND THEN RETURN Error(400, "Already applied") END IF

  EXECUTE("INSERT INTO APPLICATION (s_id, job_id, applied_date, status)
           VALUES (?, ?, CURDATE(), 'under_review')", student_id, job_id)

  NOTIFY coordinator via NOTIFICATION table and SSE push

  RETURN Success(200, "Application submitted")
END
```

---

### 3.6.9 Algorithm 2: Resume Upload and ATS Scoring

**Description:** A student uploads a PDF resume and selects a target job role. The system extracts text from the PDF, runs a keyword-matching algorithm against a role-specific keyword dictionary, calculates an ATS score, and saves the results to the RESUME table.

**Input:**
- `resume` — Uploaded PDF file (multipart/form-data, max 5 MB)
- `jobRole` — Selected target job role (e.g., "Software Engineer", "Data Analyst")
- `versionLabel` — Optional label for resume versioning (e.g., "v1", "v2")

**Output:**
- `ats_score` — Numerical ATS score (0–100)
- `grade` — Letter grade (A, B, C, D)
- `foundKeywords` — List of matched keywords
- `missingKeywords` — List of keywords not found in resume
- Stored row in RESUME table with all ATS results

**Steps:**

- **Step 1:** Validate JWT; confirm the user has role `'student'`.
- **Step 2:** Receive PDF via Multer middleware; validate MIME type is `application/pdf`. Reject non-PDF files.
- **Step 3:** Read file buffer from disk and pass to `pdf-parse` library to extract raw text string.
- **Step 4:** Validate extracted text length ≥ 50 characters. If too short or unreadable (scanned image), reject and delete temp file.
- **Step 5:** Pass `(resumeText, jobRole)` to `calculateATSScore()` function in `server/utils/atsScoring.js`.
  - Sub-step 5a: Tokenize resume text to lowercase words.
  - Sub-step 5b: Load role-specific required keyword list for the selected `jobRole`.
  - Sub-step 5c: For each keyword in the list, check if it appears in the token set.
  - Sub-step 5d: Calculate `matchPercentage = (foundCount / totalKeywords) × 100`.
  - Sub-step 5e: Apply weighted bonus scoring for structure checks (sections like "Education", "Projects", "Skills").
  - Sub-step 5f: Assign letter grade: A (≥80%), B (≥65%), C (≥50%), D (<50%).
- **Step 6:** Dynamically check if `role_targeted`, `keywords_found`, `keywords_missing` columns exist in RESUME table.
- **Step 7:** Execute `INSERT INTO RESUME` with `s_id`, `file_url`, `ats_score`, `uploaded_on`, `version_label`, `keywords_found (JSON)`, `keywords_missing (JSON)`.
- **Step 8:** Delete the temporary uploaded file from disk.
- **Step 9:** Return JSON response with score, grade, breakdown, foundKeywords, missingKeywords, and resume_id.

```
Algorithm: ATS_RESUME_SCORE(pdf_file, jobRole, student_id)
──────────────────────────────────────────────────────────
INPUT  : pdf_file (binary), jobRole (string), student_id (int)
OUTPUT : ats_score, grade, foundKeywords, missingKeywords, resume_id

BEGIN
  VALIDATE file.mimetype == 'application/pdf'
  resumeText ← PDF_PARSE(pdf_file).extractText()
  IF LENGTH(resumeText) < 50 THEN
    DELETE temp file
    RETURN Error(400, "Unreadable PDF")
  END IF

  keywordList ← LOAD_KEYWORDS_FOR_ROLE(jobRole)
  foundKeywords   ← []
  missingKeywords ← []

  FOR EACH keyword IN keywordList DO
    IF keyword IN LOWERCASE(resumeText) THEN
      APPEND keyword TO foundKeywords
    ELSE
      APPEND keyword TO missingKeywords
    END IF
  END FOR

  matchPercentage ← (COUNT(foundKeywords) / COUNT(keywordList)) × 100
  bonusScore      ← CHECK_RESUME_SECTIONS(resumeText)   // Education, Skills, etc.
  ats_score       ← MIN(100, matchPercentage + bonusScore)
  grade           ← ASSIGN_GRADE(ats_score)             // A/B/C/D

  EXECUTE INSERT INTO RESUME (s_id, file_url, ats_score, keywords_found,
                              keywords_missing, role_targeted, version_label)

  RETURN { ats_score, grade, foundKeywords, missingKeywords, resume_id }
END
```

---

### 3.6.10 Algorithm 3: Application Status Update and Offer Acceptance

**Description:** When a student accepts a job offer, the system must atomically execute several operations inside a single database transaction: lock the job to check vacancy count, decrement vacancies, update the OFFER record, mark the APPLICATION as selected, update the student's `profile_status` to `'placed'`, and create a PLACEMENT_RECORD. A COMMIT or ROLLBACK ensures all-or-nothing consistency.

**Input:**
- `student_id` — From JWT
- `job_id` — From request body

**Output:**
- Student marked as `'placed'` in STUDENT table
- OFFER record created/updated to `'accepted'`
- APPLICATION status set to `'selected'`
- New row inserted in PLACEMENT_RECORD
- Admin notification sent

**Steps:**

- **Step 1:** Validate JWT; confirm role is `'student'`.
- **Step 2:** Begin database transaction (`conn.beginTransaction()`).
- **Step 3:** Check STUDENT.profile_status. If already `'placed'`, roll back and return error.
- **Step 4:** Acquire row-level lock on JOB_PROFILE using `SELECT ... FOR UPDATE` to prevent concurrent over-acceptance.
- **Step 5:** Check `vacancies` count. If `vacancies ≤ 0`, roll back and return error "Vacancy limit reached".
- **Step 6:** Decrement vacancies: `UPDATE JOB_PROFILE SET vacancies = vacancies - 1 WHERE job_id = ?`.
- **Step 7:** Insert or update OFFER record to `offer_status = 'accepted'`.
- **Step 8:** Update APPLICATION: `SET status = 'selected'`.
- **Step 9:** Update STUDENT: `SET profile_status = 'placed'`.
- **Step 10:** Insert PLACEMENT_RECORD with `s_id`, `comp_id`, `academic_year`, `salary_offered`, `status = 'confirmed'`.
- **Step 11:** Commit transaction (`conn.commit()`).
- **Step 12:** After commit, asynchronously notify all CGDC Admins via NOTIFICATION table about the placement event.
- **Step 13:** Return HTTP 200: "Offer accepted successfully! You are now marked as PLACED."

```
Algorithm: ACCEPT_OFFER(student_id, job_id)
────────────────────────────────────────────
INPUT  : student_id (from JWT), job_id (from request body)
OUTPUT : Atomic placement record creation + notifications

BEGIN
  conn ← GET_DB_CONNECTION()
  conn.BEGIN_TRANSACTION()

  TRY
    student ← QUERY("SELECT profile_status FROM STUDENT WHERE s_id = ?", student_id)
    IF student.profile_status == 'placed' THEN
      RAISE Error("Already accepted an offer")
    END IF

    job ← QUERY("SELECT package, vacancies FROM JOB_PROFILE WHERE job_id = ? FOR UPDATE", job_id)
    IF job.vacancies <= 0 THEN
      RAISE Error("Vacancy limit reached")
    END IF

    EXECUTE("UPDATE JOB_PROFILE SET vacancies = vacancies - 1 WHERE job_id = ?", job_id)
    UPSERT OFFER SET offer_status = 'accepted' WHERE s_id = ? AND job_id = ?
    UPDATE APPLICATION SET status = 'selected' WHERE s_id = ? AND job_id = ?
    UPDATE STUDENT SET profile_status = 'placed' WHERE s_id = ?
    INSERT INTO PLACEMENT_RECORD (s_id, comp_id, academic_year, salary_offered, status)

    conn.COMMIT()
    NOTIFY all CGDC_ADMIN rows via NOTIFICATION table
    RETURN Success(200, "Offer accepted. Student is now PLACED.")

  CATCH error
    conn.ROLLBACK()
    RETURN Error(500, error.message)

  FINALLY
    conn.RELEASE()
  END TRY
END
```

---

### 3.6.11 Algorithm 4: Application Withdrawal with Atomic Cleanup

**Description:** When a student withdraws an application, the system must atomically update the application status and cancel all upcoming interviews for that specific job — ensuring the database is never left in a partially-updated state.

**Input:**
- `student_id` — From JWT
- `job_id` — From request body

**Output:**
- APPLICATION status set to `'withdrawn'`
- All future INTERVIEW rows for `(s_id, job_id)` deleted
- COMMIT on success / ROLLBACK on failure

**Steps:**

- **Step 1:** Validate JWT; confirm role is `'student'`.
- **Step 2:** Begin database transaction.
- **Step 3:** Query APPLICATION with `FOR UPDATE` lock to get current status.
- **Step 4:** If application not found, raise error "Application not found".
- **Step 5:** If status is `'selected'` or `'placed'`, raise error "Cannot withdraw a selected application".
- **Step 6:** Execute `UPDATE APPLICATION SET status = 'withdrawn'`.
- **Step 7:** Execute `DELETE FROM INTERVIEW WHERE s_id = ? AND job_id = ? AND interview_date >= CURDATE()` — removes only future interviews.
- **Step 8:** Commit transaction.
- **Step 9:** Return HTTP 200: "Application withdrawn and interviews cancelled."

```
Algorithm: WITHDRAW_APPLICATION(student_id, job_id)
────────────────────────────────────────────────────
INPUT  : student_id (from JWT), job_id (from request body)
OUTPUT : Application withdrawn, upcoming interviews deleted

BEGIN
  conn ← GET_DB_CONNECTION()
  conn.BEGIN_TRANSACTION()

  TRY
    app ← QUERY("SELECT status FROM APPLICATION
                 WHERE s_id = ? AND job_id = ? FOR UPDATE", student_id, job_id)

    IF app NOT FOUND THEN RAISE Error("Application not found") END IF

    IF app.status IN ('selected', 'placed') THEN
      RAISE Error("Cannot withdraw a selected application")
    END IF

    EXECUTE("UPDATE APPLICATION SET status = 'withdrawn'
             WHERE s_id = ? AND job_id = ?", student_id, job_id)

    EXECUTE("DELETE FROM INTERVIEW
             WHERE s_id = ? AND job_id = ? AND interview_date >= CURDATE()",
             student_id, job_id)

    conn.COMMIT()
    RETURN Success(200, "Application withdrawn and interviews cancelled.")

  CATCH error
    conn.ROLLBACK()
    RETURN Error(500, error.message)

  FINALLY
    conn.RELEASE()
  END TRY
END
```

---

### 3.6.12 Security Implementation

The system implements multiple layers of security:

| Security Mechanism | Implementation Detail |
|---|---|
| **Password Hashing** | Passwords stored as SHA-256 hash in `USER_ROLE.password_hash`. Plain-text passwords never stored. |
| **JWT Authentication** | Every API request requires a valid Bearer token signed with `process.env.JWT_SECRET`. Tokens expire in 24 hours. |
| **Role-Based Access Control (RBAC)** | `requireAuth` middleware extracts role from JWT. Each route checks `req.user.role` before executing. Students cannot access coordinator/admin routes. |
| **SQL Injection Prevention** | All SQL queries use parameterized statements (`pool.query('... WHERE id = ?', [id])`). No string concatenation in queries. |
| **File Upload Security** | Multer validates MIME type (`application/pdf` only). File size limit: 5 MB. Temp files deleted after processing. |
| **Environment Secrets** | DB credentials and JWT secret stored in `.env` files, excluded from git via `.gitignore`. |
| **CORS Configuration** | Express CORS middleware configured with `origin: true, credentials: true` for controlled cross-origin access. |
| **Concurrency Locking** | Critical operations (apply, accept offer) use MySQL `FOR UPDATE` row-level locks to prevent race conditions. |
