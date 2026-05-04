# ER DIAGRAM RELATIONSHIPS & CARDINALITY ANALYSIS

## Student Placement Database Management System

---

## TABLE 1: CGDC_ADMIN

**Primary Key**: cgdc_id (INT, AUTO_INCREMENT)  
**Role**: Root administrative entity - superordinate to all other user roles  
**Participation Type**: TOTAL (every placement coordinator must have a supervising CGDC admin)

### Outgoing Relationships

#### 1.1: CGDC_ADMIN → PLACEMENT_COORDINATOR

- **Relationship Name**: "supervises"
- **Cardinality**: 1:N (One CGDC_ADMIN supervises many PLACEMENT_COORDINATORs)
- **Foreign Key**: PLACEMENT_COORDINATOR.cgdc_id → CGDC_ADMIN.cgdc_id
- **Participation**:
  - CGDC_ADMIN: **TOTAL** (every CGDC_ADMIN supervises at least one coordinator)
  - PLACEMENT_COORDINATOR: **TOTAL** (every coordinator must be supervised by exactly one CGDC_ADMIN)
- **Cascade Rule**: SET NULL (if CGDC_ADMIN deleted, coordinator becomes unsupervised)
- **Example**: One CGDC Admin "Dr. Sharma" supervises multiple coordinators from different departments

---

## TABLE 2: PLACEMENT_COORDINATOR

**Primary Key**: coord_id (INT, AUTO_INCREMENT)  
**Attributes**: name, dept, email, phone_no, cgdc_id (FK), avatar_url  
**Role**: Middle-tier entity managing students and connecting CGDC to operational student data  
**Participation Type**: TOTAL (every coordinator supervises at least one student)

### Incoming Relationships

#### 2.1: CGDC_ADMIN → PLACEMENT_COORDINATOR (reverse of 1.1)

- **Relationship Name**: "is_supervised_by"
- **Cardinality**: N:1
- **Participation**: TOTAL (Every PLACEMENT_COORDINATOR must have a CGDC supervisor)

### Outgoing Relationships

#### 2.2: PLACEMENT_COORDINATOR → STUDENT

- **Relationship Name**: "coordinates"
- **Cardinality**: 1:N (One PLACEMENT_COORDINATOR coordinates many STUDENTs)
- **Foreign Key**: STUDENT.coord_id → PLACEMENT_COORDINATOR.coord_id
- **Participation**:
  - PLACEMENT_COORDINATOR: **PARTIAL** (a coordinator may have no students assigned in some edge cases)
  - STUDENT: **TOTAL** (every STUDENT must be assigned to exactly one PLACEMENT_COORDINATOR)
- **Cascade Rule**: SET NULL
- **Example**: Coordinator "Ms. Priya" coordinates students from CSE department

#### 2.3: PLACEMENT_COORDINATOR → APPLICATION

- **Relationship Name**: "manages"
- **Cardinality**: 1:N (One PLACEMENT_COORDINATOR manages multiple APPLICATIONs)
- **Foreign Key**: APPLICATION.assigned_coord_id → PLACEMENT_COORDINATOR.coord_id
- **Participation**:
  - PLACEMENT_COORDINATOR: **PARTIAL** (not all coordinators may manage applications in their portfolio)
  - APPLICATION: **PARTIAL** (not all applications are assigned to a coordinator initially)
- **Cascade Rule**: SET NULL
- **Example**: Coordinator processes multiple student applications for different companies

---

## TABLE 3: STUDENT

**Primary Key**: s_id (INT, AUTO_INCREMENT)  
**Attributes**: s_name, email, phone, date_of_birth, dept, cgpa, graduation_yr, profile_status, avatar_url, created_at  
**Role**: Central weak entity; depends on PLACEMENT_COORDINATOR for coordination hierarchy  
**Participation Type**: TOTAL (every student must be coordinated by a coordinator)

### Incoming Relationships

#### 3.1: PLACEMENT_COORDINATOR → STUDENT (reverse of 2.2)

- **Relationship Name**: "is_coordinated_by"
- **Cardinality**: N:1
- **Participation**: TOTAL (Every STUDENT must have a PLACEMENT_COORDINATOR)

### Outgoing Relationships

#### 3.2: STUDENT → USER_ROLE

- **Relationship Name**: "has_account"
- **Cardinality**: 1:1 (One STUDENT has exactly one USER_ROLE with polymorphic entity_id)
- **Foreign Key Pattern**: USER_ROLE.entity_id = STUDENT.s_id (polymorphic reference)
- **Participation**:
  - STUDENT: **TOTAL** (every STUDENT must have a login account in USER_ROLE)
  - USER_ROLE: **PARTIAL** (not all USER_ROLE records are students; some are coordinators or admins)
- **Note**: USER_ROLE.role = 'student' identifies this relationship; no database FK constraint due to polymorphic design

#### 3.3: STUDENT → RESUME (1:N)

- **Relationship Name**: "uploads"
- **Cardinality**: 1:N (One STUDENT uploads multiple RESUMEs across versions)
- **Foreign Key**: RESUME.s_id → STUDENT.s_id
- **Participation**:
  - STUDENT: **PARTIAL** (some students may not have uploaded any resume)
  - RESUME: **TOTAL** (every RESUME belongs to exactly one STUDENT)
- **Cascade Rule**: CASCADE
- **Example**: "Raj" uploads resume_v1, resume_v2, resume_v3 for different job roles

#### 3.4: STUDENT → APPLICATION (1:N)

- **Relationship Name**: "applies_to"
- **Cardinality**: 1:N (One STUDENT submits multiple APPLICATIONs to different jobs)
- **Foreign Key**: APPLICATION.s_id → STUDENT.s_id
- **Participation**:
  - STUDENT: **PARTIAL** (some students may not apply to any job)
  - APPLICATION: **TOTAL** (every APPLICATION is by exactly one STUDENT)
- **Cascade Rule**: CASCADE
- **Constraint**: UNIQUE(s_id, job_id) ensures no duplicate applications
- **Example**: "Priya" applies to 15 different job profiles across multiple companies

#### 3.5: STUDENT → INTERVIEW (1:N)

- **Relationship Name**: "attends"
- **Cardinality**: 1:N (One STUDENT attends multiple INTERVIEWs)
- **Foreign Key**: INTERVIEW.s_id → STUDENT.s_id
- **Participation**:
  - STUDENT: **PARTIAL** (some students may not attend any interview)
  - INTERVIEW: **TOTAL** (every INTERVIEW is for exactly one STUDENT)
- **Cascade Rule**: CASCADE
- **Example**: "Arjun" attends interviews for 3 different job profiles

#### 3.6: STUDENT → OFFER (1:N)

- **Relationship Name**: "receives"
- **Cardinality**: 1:N (One STUDENT receives multiple OFFERs from different companies)
- **Foreign Key**: OFFER.s_id → STUDENT.s_id
- **Participation**:
  - STUDENT: **PARTIAL** (not all students receive offers)
  - OFFER: **TOTAL** (every OFFER is issued to exactly one STUDENT)
- **Cascade Rule**: CASCADE
- **Constraint**: UNIQUE(s_id, job_id) ensures one offer per job per student
- **Example**: "Isha" receives offers from TCS and Infosys

#### 3.7: STUDENT → PLACEMENT_RECORD (1:N)

- **Relationship Name**: "secures_placement"
- **Cardinality**: 1:N (One STUDENT can have multiple PLACEMENT_RECORDs across years or from different companies)
- **Foreign Key**: PLACEMENT_RECORD.s_id → STUDENT.s_id
- **Participation**:
  - STUDENT: **PARTIAL** (not all students secure placements)
  - PLACEMENT_RECORD: **TOTAL** (every PLACEMENT_RECORD is for exactly one STUDENT)
- **Cascade Rule**: CASCADE
- **Example**: "Vikram" has placements in 2024 and 2025 (lateral hire or multiple offers)

#### 3.8: STUDENT → STUDENT_SKILL (1:N)

- **Relationship Name**: "possesses"
- **Cardinality**: 1:N (One STUDENT possesses multiple SKILLs)
- **Foreign Key**: STUDENT_SKILL.s_id → STUDENT.s_id
- **Participation**:
  - STUDENT: **PARTIAL** (some students may have no skills recorded)
  - STUDENT_SKILL: **TOTAL** (every skill record belongs to exactly one STUDENT)
- **Cascade Rule**: CASCADE
- **Example**: "Neha" possesses Python, Java, SQL, Machine Learning

---

## TABLE 4: USER_ROLE

**Primary Key**: user_id (INT, AUTO_INCREMENT)  
**Attributes**: username (UNIQUE), password_hash, role (ENUM), entity_id, is_active, last_login  
**Role**: Centralized authentication entity; polymorphic parent to STUDENT, PLACEMENT_COORDINATOR, CGDC_ADMIN  
**Participation Type**: TOTAL (every USER_ROLE must represent one of the three user types)

### Incoming Relationships

#### 4.1: STUDENT → USER_ROLE (1:1)

- **Relationship Name**: "has_login_account"
- **Cardinality**: 1:1
- **Participation**: TOTAL (Every STUDENT must have a USER_ROLE account)
- **Entity Identification**: USER_ROLE.role = 'student' AND USER_ROLE.entity_id = STUDENT.s_id
- **Pattern**: Polymorphic (no FK constraint; application-layer enforces validation)
- **Example**: STUDENT(s_id=5, "Arun") ↔ USER_ROLE(user_id=101, role='student', entity_id=5)

#### 4.2: PLACEMENT_COORDINATOR → USER_ROLE (1:1)

- **Relationship Name**: "has_login_account"
- **Cardinality**: 1:1
- **Participation**: TOTAL (Every PLACEMENT_COORDINATOR must have a USER_ROLE account)
- **Entity Identification**: USER_ROLE.role = 'coordinator' AND USER_ROLE.entity_id = PLACEMENT_COORDINATOR.coord_id
- **Pattern**: Polymorphic (application-layer enforces validation)
- **Example**: PLACEMENT_COORDINATOR(coord_id=2, "Ms. Sharma") ↔ USER_ROLE(user_id=205, role='coordinator', entity_id=2)

#### 4.3: CGDC_ADMIN → USER_ROLE (1:1)

- **Relationship Name**: "has_login_account"
- **Cardinality**: 1:1
- **Participation**: TOTAL (Every CGDC_ADMIN must have a USER_ROLE account)
- **Entity Identification**: USER_ROLE.role = 'cgdc_admin' AND USER_ROLE.entity_id = CGDC_ADMIN.cgdc_id
- **Pattern**: Polymorphic (application-layer enforces validation)
- **Example**: CGDC_ADMIN(cgdc_id=1, "Dr. Rao") ↔ USER_ROLE(user_id=301, role='cgdc_admin', entity_id=1)

---

## TABLE 5: COMPANY

**Primary Key**: comp_id (INT, AUTO_INCREMENT)  
**Attributes**: comp_name, industry_type, location, contact_email, contact_phone, job_role, tier (ENUM), website, created_at  
**Role**: Root entity for recruitment domain; initiates all hiring pipelines  
**Participation Type**: PARTIAL (not all companies may post jobs in every year)

### Outgoing Relationships

#### 5.1: COMPANY → JOB_PROFILE (1:N)

- **Relationship Name**: "posts"
- **Cardinality**: 1:N (One COMPANY posts multiple JOB_PROFILEs)
- **Foreign Key**: JOB_PROFILE.comp_id → COMPANY.comp_id
- **Participation**:
  - COMPANY: **PARTIAL** (some companies may not have active job postings)
  - JOB_PROFILE: **TOTAL** (every JOB_PROFILE belongs to exactly one COMPANY)
- **Cascade Rule**: CASCADE
- **Example**: "Accenture" posts 50+ different job profiles for various roles

#### 5.2: COMPANY → PLACEMENT_RECORD (1:N)

- **Relationship Name**: "hires"
- **Cardinality**: 1:N (One COMPANY hires multiple STUDENTs, recorded in PLACEMENT_RECORDs)
- **Foreign Key**: PLACEMENT_RECORD.comp_id → COMPANY.comp_id
- **Participation**:
  - COMPANY: **PARTIAL** (some companies may not successfully place anyone)
  - PLACEMENT_RECORD: **TOTAL** (every placement is from exactly one COMPANY)
- **Cascade Rule**: CASCADE
- **Example**: "Google" hired 25 students in 2024-2025 academic year

#### 5.3: COMPANY → COMPANY_VISIT_HISTORY (1:N)

- **Relationship Name**: "visits_campus"
- **Cardinality**: 1:N (One COMPANY visits campus multiple times across different years)
- **Foreign Key**: COMPANY_VISIT_HISTORY.comp_id → COMPANY.comp_id
- **Participation**:
  - COMPANY: **PARTIAL** (first-time recruiters may have only one visit)
  - COMPANY_VISIT_HISTORY: **TOTAL** (every visit is by exactly one COMPANY)
- **Cascade Rule**: CASCADE
- **Constraint**: UNIQUE(comp_id, academic_year) ensures one visit record per company per year
- **Example**: "Infosys" visits campus in 2021, 2022, 2023, 2024, 2025 (5 visits across 5 years)

---

## TABLE 6: JOB_PROFILE

**Primary Key**: job_id (INT, AUTO_INCREMENT)  
**Attributes**: comp_id (FK), role, job_type, package, eligibility_cgpa, eligible_branch, app_deadline, status, job_description, required_skills, vacancies  
**Role**: Child of COMPANY; represents individual job postings  
**Participation Type**: TOTAL (every job profile belongs to exactly one company)

### Incoming Relationships

#### 6.1: COMPANY → JOB_PROFILE (reverse of 5.1)

- **Relationship Name**: "is_posted_by"
- **Cardinality**: N:1
- **Participation**: TOTAL (Every JOB_PROFILE must belong to exactly one COMPANY)

### Outgoing Relationships

#### 6.2: JOB_PROFILE → JOB_REQUIRED_SKILL (1:N)

- **Relationship Name**: "requires"
- **Cardinality**: 1:N (One JOB_PROFILE requires multiple SKILLs)
- **Foreign Key**: JOB_REQUIRED_SKILL.job_id → JOB_PROFILE.job_id
- **Participation**:
  - JOB_PROFILE: **PARTIAL** (some generic roles may not have specific skill requirements)
  - JOB_REQUIRED_SKILL: **TOTAL** (every skill requirement record belongs to exactly one JOB_PROFILE)
- **Cascade Rule**: CASCADE
- **Composite Key**: (job_id, skill_name)
- **Normalization**: 1NF fix for multi-valued required_skills attribute
- **Example**: "Senior Software Engineer" role requires Python, Java, SQL, AWS, Docker

#### 6.3: JOB_PROFILE → JOB_ELIGIBILITY_BRANCH (1:N)

- **Relationship Name**: "accepts_from"
- **Cardinality**: 1:N (One JOB_PROFILE accepts applications from multiple BRANCHes)
- **Foreign Key**: JOB_ELIGIBILITY_BRANCH.job_id → JOB_PROFILE.job_id
- **Participation**:
  - JOB_PROFILE: **PARTIAL** (some roles may be open to all branches)
  - JOB_ELIGIBILITY_BRANCH: **TOTAL** (every eligibility record belongs to exactly one JOB_PROFILE)
- **Cascade Rule**: CASCADE
- **Composite Key**: (job_id, branch_name)
- **Normalization**: 1NF fix for multi-valued eligible_branch attribute
- **Example**: "IT Consultant" role accepts from CSE, ECE, IT branches

#### 6.4: JOB_PROFILE → APPLICATION (1:N)

- **Relationship Name**: "receives_applications_from"
- **Cardinality**: 1:N (One JOB_PROFILE receives multiple APPLICATIONs from different STUDENTs)
- **Foreign Key**: APPLICATION.job_id → JOB_PROFILE.job_id
- **Participation**:
  - JOB_PROFILE: **PARTIAL** (some roles with high barriers may receive no applications)
  - APPLICATION: **TOTAL** (every APPLICATION is for exactly one JOB_PROFILE)
- **Cascade Rule**: CASCADE
- **Example**: "Data Scientist" role receives 200+ applications

#### 6.5: JOB_PROFILE → INTERVIEW (1:N)

- **Relationship Name**: "is_evaluated_through"
- **Cardinality**: 1:N (One JOB_PROFILE may have multiple INTERVIEWs across different candidates)
- **Foreign Key**: INTERVIEW.job_id → JOB_PROFILE.job_id
- **Participation**:
  - JOB_PROFILE: **PARTIAL** (some roles may not progress to interviews)
  - INTERVIEW: **TOTAL** (every INTERVIEW is for exactly one JOB_PROFILE)
- **Cascade Rule**: CASCADE
- **Example**: "Product Manager" position schedules 15 interviews

#### 6.6: JOB_PROFILE → OFFER (1:N)

- **Relationship Name**: "issues_offers_from"
- **Cardinality**: 1:N (One JOB_PROFILE can issue multiple OFFERs)
- **Foreign Key**: OFFER.job_id → JOB_PROFILE.job_id
- **Participation**:
  - JOB_PROFILE: **PARTIAL** (some positions may not issue any offers)
  - OFFER: **TOTAL** (every OFFER is for exactly one JOB_PROFILE)
- **Cascade Rule**: CASCADE
- **Constraint**: UNIQUE(s_id, job_id) ensures max one offer per student per job
- **Example**: "Solutions Architect" issues 8 offers for 10 vacancies

#### 6.7: JOB_PROFILE → PLACEMENT_RECORD (1:N - Weak Relationship)

- **Relationship Name**: "results_in_placement"
- **Cardinality**: 1:N (One JOB_PROFILE can result in multiple successful PLACEMENTs)
- **Foreign Key**: PLACEMENT_RECORD.job_id → JOB_PROFILE.job_id (OPTIONAL)
- **Participation**:
  - JOB_PROFILE: **PARTIAL** (not all job profiles result in placements)
  - PLACEMENT_RECORD: **PARTIAL** (a placement may not have an associated job_id if hired through referral)
- **Cascade Rule**: SET NULL
- **Example**: "Consultant" role results in 5 successful placements

---

## TABLE 7: JOB_REQUIRED_SKILL (Normalized Mapping Table)

**Primary Key**: (job_id, skill_name) — Composite key  
**Attributes**: job_id (FK), skill_name  
**Role**: Bridge entity; resolves multi-valued skills attribute in JOB_PROFILE (1NF normalization)  
**Participation Type**: TOTAL (every required skill record must belong to a job)

### Incoming Relationships

#### 7.1: JOB_PROFILE → JOB_REQUIRED_SKILL (reverse of 6.2)

- **Relationship Name**: "has_required_skills"
- **Cardinality**: N:1 (Many skill records per job)
- **Participation**: TOTAL (every skill requirement belongs to exactly one job)

### Business Logic

- Eliminates multi-valued "required_skills" field that violated 1NF
- Each row represents ONE atomic skill requirement
- Example: {"job_id": 101, "skill_name": "Python"} is a separate row from {"job_id": 101, "skill_name": "AWS"}
- Enables skill-based searching and filtering

---

## TABLE 8: JOB_ELIGIBILITY_BRANCH (Normalized Mapping Table)

**Primary Key**: (job_id, branch_name) — Composite key  
**Attributes**: job_id (FK), branch_name  
**Role**: Bridge entity; resolves multi-valued branches attribute in JOB_PROFILE (1NF normalization)  
**Participation Type**: TOTAL (every eligible branch record must belong to a job)

### Incoming Relationships

#### 8.1: JOB_PROFILE → JOB_ELIGIBILITY_BRANCH (reverse of 6.3)

- **Relationship Name**: "has_eligible_branches"
- **Cardinality**: N:1 (Many branch records per job)
- **Participation**: TOTAL (every eligible branch belongs to exactly one job)

### Business Logic

- Eliminates multi-valued "eligible_branch" field that violated 1NF
- Each row represents ONE atomic branch eligibility
- Example: {"job_id": 101, "branch_name": "CSE"} is separate from {"job_id": 101, "branch_name": "IT"}
- Enables branch-based filtering and statistics

---

## TABLE 9: DEPARTMENT (Lookup/Reference Table)

**Primary Key**: dept_id (INT, AUTO_INCREMENT)  
**Attributes**: dept_name (UNIQUE)  
**Role**: Canonical reference for 5 departments (CSE, ECE, ME, IT, Civil)  
**Participation Type**: PARTIAL (lookup table; may not be connected to every entity)

### Relationships

- **No direct FK relationships** in current schema
- Used for reference integrity in STUDENT.dept field validation
- Could be used to create FK: STUDENT.dept → DEPARTMENT.dept_name (for better normalization)
- **Potential Optimization**: Add dept_id as FK in STUDENT instead of VARCHAR dept field

---

## TABLE 10: APPLICATION (Bridge Table - Many-to-Many Resolution)

**Primary Key**: app_id (INT, AUTO_INCREMENT)  
**Attributes**: s_id (FK), job_id (FK), resume_id (FK), applied_date, status (ENUM), ats_score, assigned_coord_id (FK)  
**Role**: Resolves M:N relationship between STUDENT and JOB_PROFILE  
**Participation Type**: TOTAL (every application links exactly one student to one job)

### Incoming Relationships

#### 10.1: STUDENT → APPLICATION (reverse of 3.4)

- **Relationship Name**: "is_application_from"
- **Cardinality**: N:1
- **Participation**: TOTAL (Every APPLICATION must be from exactly one STUDENT)

#### 10.2: JOB_PROFILE → APPLICATION (reverse of 6.4)

- **Relationship Name**: "is_application_for"
- **Cardinality**: N:1
- **Participation**: TOTAL (Every APPLICATION is for exactly one JOB_PROFILE)

#### 10.3: RESUME → APPLICATION (inverse of 11.2)

- **Relationship Name**: "uses_resume"
- **Cardinality**: N:1
- **Participation**: PARTIAL (an APPLICATION may not have a resume attached initially)

#### 10.4: PLACEMENT_COORDINATOR → APPLICATION (reverse of 2.3)

- **Relationship Name**: "is_managed_by"
- **Cardinality**: N:1
- **Participation**: PARTIAL (not all applications are assigned to a coordinator)

### Outgoing Relationships

#### 10.5: APPLICATION → INTERVIEW (1:N - Implicit)

- **Relationship Name**: "leads_to"
- **Cardinality**: 1:N (One APPLICATION can lead to multiple INTERVIEWs if multiple rounds)
- **Implicit**: Identified by (APPLICATION.s_id, APPLICATION.job_id) matching (INTERVIEW.s_id, INTERVIEW.job_id)
- **Participation**: PARTIAL (not all applications progress to interview stage)

#### 10.6: APPLICATION → STATUS_AUDIT_LOG (1:N)

- **Relationship Name**: "generates_audit_trail"
- **Cardinality**: 1:N (One APPLICATION generates multiple audit log entries as status changes)
- **Foreign Key**: STATUS_AUDIT_LOG.app_id → APPLICATION.app_id
- **Participation**:
  - APPLICATION: **PARTIAL** (static applications may have few log entries)
  - STATUS_AUDIT_LOG: **TOTAL** (every log entry belongs to exactly one APPLICATION)
- **Cascade Rule**: CASCADE
- **Example**: "Applied" → "Under Review" → "Shortlisted" → "Selected" = 4 audit logs

### Constraints & Business Rules

- **UNIQUE(s_id, job_id)**: Prevents duplicate applications (one student can't apply to same job twice)
- **Status Lifecycle**: 'applied' → 'under_review' → 'shortlisted' → 'selected'/'rejected'
- **ATS Integration**: ats_score field stores resume matching score (0-100)
- **Coordination**: assigned_coord_id allows manual assignment for coordinator review

---

## TABLE 11: INTERVIEW

**Primary Key**: interview_id (INT, AUTO_INCREMENT)  
**Attributes**: s_id (FK), job_id (FK), panel_name, interview_date, interview_time, interview_mode (ENUM), interview_result (ENUM), room_no  
**Role**: Records interview rounds for STUDENT-JOB_PROFILE evaluation  
**Participation Type**: PARTIAL (not all students advance to interview stage)

### Incoming Relationships

#### 11.1: STUDENT → INTERVIEW (reverse of 3.5)

- **Relationship Name**: "is_interviewed_for"
- **Cardinality**: N:1
- **Participation**: PARTIAL (Some students may attend interviews, others may not)

#### 11.2: JOB_PROFILE → INTERVIEW (reverse of 6.5)

- **Relationship Name**: "is_evaluated_through"
- **Cardinality**: N:1
- **Participation**: PARTIAL (Not all job profiles require interviews)

### Business Logic

- **Implicit Relationship to APPLICATION**: Identified by matching (s_id, job_id) pair
- **Interview Rounds**: Multiple interview records can exist for same (s_id, job_id) if multiple rounds
- **Status Tracking**: interview_result ENUM enforces 'pass'/'fail'/'on_hold'/'pending'
- **Interview Modes**: Supports 'online', 'offline', 'hybrid' delivery methods
- **Example**: "Raj" interviews for "Python Developer" role → Round 1 (Technical Interview) → Round 2 (HR Interview)

---

## TABLE 12: OFFER

**Primary Key**: offer_id (INT, AUTO_INCREMENT)  
**Attributes**: s_id (FK), job_id (FK), offer_status (ENUM), joining_date, ctc, offer_letter_url, issued_on  
**Role**: Records job offers issued to students after successful interviews  
**Participation Type**: PARTIAL (not all students receive offers)

### Incoming Relationships

#### 12.1: STUDENT → OFFER (reverse of 3.6)

- **Relationship Name**: "receives_offer_for"
- **Cardinality**: N:1
- **Participation**: PARTIAL (Some students receive multiple offers, others receive none)

#### 12.2: JOB_PROFILE → OFFER (reverse of 6.6)

- **Relationship Name**: "issues_offer_for"
- **Cardinality**: N:1
- **Participation**: PARTIAL (Not all job profiles result in offers)

### Constraints & Business Rules

- **UNIQUE(s_id, job_id)**: Max one offer per student per job
- **Offer Status Lifecycle**: 'pending' → 'accepted'/'rejected'
- **Financial Data**: ctc field stores final negotiated package
- **Document Trail**: offer_letter_url stores offer letter PDF location
- **Example**: "Priya" receives offer from Accenture for "Software Engineer" role with 6.5 LPA

---

## TABLE 13: PLACEMENT_RECORD

**Primary Key**: record_id (INT, AUTO_INCREMENT)  
**Attributes**: s_id (FK), comp_id (FK), job_id (FK - optional), academic_year, salary_offered, status (ENUM), recorded_on  
**Role**: Permanent record of successful student placements; audit trail for reporting  
**Participation Type**: PARTIAL (not all students secure placement)

### Incoming Relationships

#### 13.1: STUDENT → PLACEMENT_RECORD (reverse of 3.7)

- **Relationship Name**: "has_placement_record"
- **Cardinality**: N:1
- **Participation**: PARTIAL (Some students may have multiple placements, others may have none)

#### 13.2: COMPANY → PLACEMENT_RECORD (reverse of 5.2)

- **Relationship Name**: "recorded_hire_from"
- **Cardinality**: N:1
- **Participation**: PARTIAL (Not all companies result in placements)

#### 13.3: JOB_PROFILE → PLACEMENT_RECORD (reverse of 6.7)

- **Relationship Name**: "source_job_for_placement"
- **Cardinality**: N:1
- **Participation**: PARTIAL (Placement may be through referral without specific job_id)

### Key Design Decisions

- **academic_year Field**: Tracks placement year for multi-year analytics
- **Status Values**: 'confirmed', 'joined', 'offer_revoked', 'student_declined'
- **salary_offered**: Final negotiated package in LPA
- **Weak Relationship to JOB_PROFILE**: job_id is optional because students may be hired through referrals
- **Historical Snapshot**: Immutable record created once; never updated

---

## TABLE 14: RESUME

**Primary Key**: resume_id (INT, AUTO_INCREMENT)  
**Attributes**: s_id (FK), file_url, ats_score, uploaded_on, version_label, role_targeted, keywords_found (JSON), keywords_missing (JSON), is_active  
**Role**: Stores resume files and ATS evaluation results  
**Participation Type**: PARTIAL (some students may not upload resumes)

### Incoming Relationships

#### 14.1: STUDENT → RESUME (reverse of 3.3)

- **Relationship Name**: "owns_resume"
- **Cardinality**: N:1
- **Participation**: PARTIAL (Some students may upload 0, 1, or multiple resumes)

### Outgoing Relationships

#### 14.2: RESUME → RESUME_PARSED_KEYWORD (1:N)

- **Relationship Name**: "contains_keywords"
- **Cardinality**: 1:N (One RESUME contains multiple extracted KEYWORDs for granular analysis)
- **Foreign Key**: RESUME_PARSED_KEYWORD.resume_id → RESUME.resume_id
- **Participation**:
  - RESUME: **PARTIAL** (some resumes may have no parsed keywords)
  - RESUME_PARSED_KEYWORD: **TOTAL** (every keyword record belongs to exactly one RESUME)
- **Cascade Rule**: CASCADE
- **Purpose**: Enables granular keyword-level analysis and ATS matching

#### 14.3: RESUME → RESUME_ANALYSIS_KEYWORD (1:N)

- **Relationship Name**: "analyzed_for_keywords"
- **Cardinality**: 1:N (One RESUME is analyzed for multiple KEYWORDs with match status)
- **Foreign Key**: RESUME_ANALYSIS_KEYWORD.analysis_id → RESUME.resume_id
- **Participation**:
  - RESUME: **PARTIAL** (not all resumes undergo keyword analysis)
  - RESUME_ANALYSIS_KEYWORD: **TOTAL** (every analysis keyword belongs to exactly one RESUME)
- **Cascade Rule**: CASCADE
- **Purpose**: Atomic keyword-level analysis for ATS feature (1NF normalization)

#### 14.4: RESUME → APPLICATION (Weak - Inverse of 10.3)

- **Relationship Name**: "used_for_application"
- **Cardinality**: 1:N (One RESUME can be used in multiple APPLICATIONs)
- **Foreign Key**: APPLICATION.resume_id → RESUME.resume_id
- **Participation**:
  - RESUME: **PARTIAL** (some resumes may not be used in any application)
  - APPLICATION: **PARTIAL** (not all applications have resume attached)
- **Cascade Rule**: SET NULL

### Design Notes

- **keywords_found / keywords_missing (JSON)**: Whole-object storage for application layer consumption
- **Versioning**: version_label enables tracking multiple resume versions (v1, v2, v3)
- **Role Targeting**: role_targeted indicates job role the resume targets
- **ATS Integration**: ats_score field (0-100) from ATS matching engine

---

## TABLE 15: RESUME_ANALYSIS_KEYWORD (Normalized Mapping Table - ATS Feature)

**Primary Key**: (analysis_id, keyword) — Composite key  
**Attributes**: analysis_id (FK → RESUME), keyword, status (ENUM)  
**Role**: Normalizes multi-valued keyword analysis from RESUME (1NF fix for ATS feature)  
**Participation Type**: TOTAL (every keyword analysis record belongs to a resume analysis)

### Incoming Relationships

#### 15.1: RESUME → RESUME_ANALYSIS_KEYWORD (reverse of 14.3)

- **Relationship Name**: "contains_analyzed_keywords"
- **Cardinality**: N:1 (Many keyword records per resume)
- **Participation**: TOTAL (every analysis keyword belongs to exactly one RESUME)

### Normalization Purpose

- Eliminates multi-valued keyword arrays that would violate 1NF
- Enables BCNF compliance: Each (analysis_id, keyword) pair is unique
- status ENUM enforces valid states: 'found' or 'missing'
- Example Rows:
  - (resume_id=5, keyword="Python", status='found')
  - (resume_id=5, keyword="Java", status='missing')
  - (resume_id=5, keyword="SQL", status='found')

---

## TABLE 16: RESUME_PARSED_KEYWORD (Normalized from JSON - Granular Analysis)

**Primary Key**: (resume_id, keyword) — Composite key  
**Attributes**: resume_id (FK), keyword  
**Role**: Stores individually extracted keywords from RESUME for granular querying  
**Participation Type**: TOTAL (every keyword record belongs to exactly one resume)

### Incoming Relationships

#### 16.1: RESUME → RESUME_PARSED_KEYWORD (reverse of 14.2)

- **Relationship Name**: "has_parsed_keywords"
- **Cardinality**: N:1 (Many keyword records per resume)
- **Participation**: TOTAL (every parsed keyword belongs to exactly one RESUME)

### Normalization Purpose

- Normalizes RESUME.keywords_found / keywords_missing (JSON fields)
- Enables efficient SQL-based keyword analysis without JSON parsing
- Example: Resume contains keywords ["Python", "SQL", "AWS", "Docker"] → 4 separate rows
- Supports queries like "Find all resumes with Python skill"

---

## TABLE 17: STUDENT_SKILL

**Primary Key**: (s_id, skill_name) — Composite key  
**Attributes**: s_id (FK), skill_name, proficiency_level  
**Role**: Stores individual skills for each student; normalizes multi-valued skills (1NF)  
**Participation Type**: PARTIAL (not all students have skills recorded)

### Incoming Relationships

#### 17.1: STUDENT → STUDENT_SKILL (reverse of 3.8)

- **Relationship Name**: "has_proficiency_in"
- **Cardinality**: N:1 (Many skill records per student)
- **Participation**: PARTIAL (Some students may have no skills recorded)

### Business Logic

- Each row = ONE atomic skill for ONE student
- proficiency_level can be: Beginner, Intermediate, Advanced, Expert
- Enables skill-based filtering: "Find students with Python > Intermediate"
- Example: {"s_id": 10, "skill_name": "Python", "proficiency_level": "Advanced"} is separate from {"s_id": 10, "skill_name": "Java", "proficiency_level": "Intermediate"}

---

## TABLE 18: COMPANY_VISIT_HISTORY

**Primary Key**: visit_id (INT, AUTO_INCREMENT)  
**Attributes**: comp_id (FK), visit_date, academic_year, hiring_cycle  
**Role**: Records each company's annual campus visits for analytics and reporting  
**Participation Type**: PARTIAL (companies may not visit every year)

### Incoming Relationships

#### 18.1: COMPANY → COMPANY_VISIT_HISTORY (reverse of 5.3)

- **Relationship Name**: "has_visit_history"
- **Cardinality**: N:1
- **Participation**: PARTIAL (Some companies visit multiple times, others may not)

### Outgoing Relationships

#### 18.2: COMPANY_VISIT_HISTORY → VISIT_COVERED_STREAM (1:N)

- **Relationship Name**: "covers_streams"
- **Cardinality**: 1:N (One campus VISIT can cover multiple academic STREAMs/departments)
- **Foreign Key**: VISIT_COVERED_STREAM.visit_id → COMPANY_VISIT_HISTORY.visit_id
- **Participation**:
  - COMPANY_VISIT_HISTORY: **PARTIAL** (some visits may not have stream coverage recorded)
  - VISIT_COVERED_STREAM: **TOTAL** (every stream record belongs to exactly one visit)
- **Cascade Rule**: CASCADE
- **Composite Key**: (visit_id, stream_name)
- **Example**: "Accenture" visit on 2025-03-15 covers CSE, ECE, IT streams (3 separate records)

### Constraints & Business Rules

- **UNIQUE(comp_id, academic_year)**: One visit history record per company per year
- **academic_year**: Used for analytics by graduation year
- **hiring_cycle**: Textual designation like "2025 Spring" or "2025 Fall"

---

## TABLE 19: VISIT_COVERED_STREAM (Normalized Mapping Table)

**Primary Key**: (visit_id, stream_name) — Composite key  
**Attributes**: visit_id (FK), stream_name  
**Role**: Normalizes multi-valued streams covered in a company visit (1NF)  
**Participation Type**: TOTAL (every stream record belongs to exactly one visit)

### Incoming Relationships

#### 19.1: COMPANY_VISIT_HISTORY → VISIT_COVERED_STREAM (reverse of 18.2)

- **Relationship Name**: "has_stream_coverage"
- **Cardinality**: N:1 (Many stream records per visit)
- **Participation**: TOTAL (every stream coverage belongs to exactly one visit)

### Normalization Purpose

- Eliminates multi-valued "streams_covered" field that would violate 1NF
- Each row represents ONE atomic department/stream covered in the visit
- Example: {"visit_id": 150, "stream_name": "CSE"} is separate from {"visit_id": 150, "stream_name": "IT"}
- Enables stream-level analytics and filtering

---

## TABLE 20: NOTIFICATION

**Primary Key**: notif_id (INT, AUTO_INCREMENT)  
**Attributes**: user_id, user_role (ENUM), title, content, type (ENUM), is_read, created_at  
**Role**: Polymorphic notification system for all three user roles  
**Participation Type**: PARTIAL (not all users may have notifications)

### Relationships

- **No direct FK relationships** (notification system is loosely coupled)
- **user_id**: Polymorphic reference to (STUDENT.s_id | PLACEMENT_COORDINATOR.coord_id | CGDC_ADMIN.cgdc_id)
- **user_role**: Determines which entity user_id refers to ('student', 'coordinator', 'admin')
- **Type Values**: 'message', 'system', 'alert'
- **Use Case**: Dashboard notifications for unread items, alerts, messages
- **is_read Flag**: Enables unread notification count queries

### Design Decision

- Polymorphic design avoids three separate notification tables
- Application-layer resolves which entity user_id belongs to based on user_role
- No database FK constraint (intentional for flexibility)

---

## TABLE 21: CHAT_MESSAGE

**Primary Key**: msg_id (INT, AUTO_INCREMENT)  
**Attributes**: sender_id, sender_role (ENUM), receiver_id, receiver_role (ENUM), message_text, is_read, created_at  
**Role**: In-portal messaging between students and coordinators; supports tri-role communications  
**Participation Type**: PARTIAL (not all user pairs exchange messages)

### Relationships

- **No direct FK relationships** (messaging system is loosely coupled)
- **sender_id / receiver_id**: Polymorphic references (STUDENT.s_id | PLACEMENT_COORDINATOR.coord_id | CGDC_ADMIN.cgdc_id)
- **sender_role / receiver_role**: Determines entity type for sender/receiver
- **Supported Communications**:
  - Student ↔ Coordinator (primary)
  - Student ↔ CGDC Admin
  - Coordinator ↔ CGDC Admin
  - Coordinator ↔ Student (reverse)

### Business Logic

- **Read Receipts**: is_read flag tracks read status
- **Conversation History**: All messages indexed by (sender_id, receiver_id) for conversation threads
- **Live Database**: 31+ message records (active communication channel)
- **Example**: Student "Raj" messages Coordinator "Ms. Sharma" about application status

---

## TABLE 22: STATUS_AUDIT_LOG (Audit Trail - Trigger-Populated)

**Primary Key**: log_id (INT, AUTO_INCREMENT)  
**Attributes**: app_id (FK), old_status, new_status, changed_at  
**Role**: Immutable audit trail of APPLICATION status changes; database trigger-driven  
**Participation Type**: TOTAL (every status change generates exactly one log entry)

### Incoming Relationships

#### 22.1: APPLICATION → STATUS_AUDIT_LOG (reverse of 10.6)

- **Relationship Name**: "has_audit_trail"
- **Cardinality**: N:1
- **Participation**: TOTAL (every audit log entry belongs to exactly one APPLICATION)

### Design & Implementation

- **Trigger**: trg_application_audit (AFTER UPDATE ON APPLICATION)
- **Mechanism**: Automatically populated when APPLICATION.status changes
- **Application Independence**: No application-layer code can bypass this audit trail
- **Immutable Records**: Once written, never updated or deleted
- **Example Flow**:
  - Application status: 'applied' → log: ('applied', 'under_review')
  - Application status: 'under_review' → log: ('under_review', 'shortlisted')
  - Application status: 'shortlisted' → log: ('shortlisted', 'selected')
  - Total: 4 records in STATUS_AUDIT_LOG for one application

### Data Integrity Benefits

- **Tamper-Proof**: Database trigger ensures no status change can skip audit logging
- **Compliance**: Complete audit trail for placement process validation
- **Forensics**: Full history of status transitions helps troubleshoot application issues
- **Reporting**: Enables time-based analytics (e.g., "average days from application to offer")

---

## RELATIONSHIP SUMMARY TABLE

| Relationship ID | Source Table          | Target Table            | Relationship Type          | Cardinality    | Participation (Source) | Participation (Target) | FK Constraint       | Cascade Rule |
| --------------- | --------------------- | ----------------------- | -------------------------- | -------------- | ---------------------- | ---------------------- | ------------------- | ------------ |
| 1.1             | CGDC_ADMIN            | PLACEMENT_COORDINATOR   | supervises                 | 1:N            | TOTAL                  | TOTAL                  | cgdc_id             | SET NULL     |
| 2.2             | PLACEMENT_COORDINATOR | STUDENT                 | coordinates                | 1:N            | PARTIAL                | TOTAL                  | coord_id            | SET NULL     |
| 2.3             | PLACEMENT_COORDINATOR | APPLICATION             | manages                    | 1:N            | PARTIAL                | PARTIAL                | assigned_coord_id   | SET NULL     |
| 3.2             | STUDENT               | USER_ROLE               | has_account                | 1:1            | TOTAL                  | PARTIAL                | Polymorphic (no FK) | —            |
| 3.3             | STUDENT               | RESUME                  | uploads                    | 1:N            | PARTIAL                | TOTAL                  | s_id                | CASCADE      |
| 3.4             | STUDENT               | APPLICATION             | applies_to                 | 1:N            | PARTIAL                | TOTAL                  | s_id                | CASCADE      |
| 3.5             | STUDENT               | INTERVIEW               | attends                    | 1:N            | PARTIAL                | TOTAL                  | s_id                | CASCADE      |
| 3.6             | STUDENT               | OFFER                   | receives                   | 1:N            | PARTIAL                | TOTAL                  | s_id                | CASCADE      |
| 3.7             | STUDENT               | PLACEMENT_RECORD        | secures_placement          | 1:N            | PARTIAL                | TOTAL                  | s_id                | CASCADE      |
| 3.8             | STUDENT               | STUDENT_SKILL           | possesses                  | 1:N            | PARTIAL                | TOTAL                  | s_id                | CASCADE      |
| 5.1             | COMPANY               | JOB_PROFILE             | posts                      | 1:N            | PARTIAL                | TOTAL                  | comp_id             | CASCADE      |
| 5.2             | COMPANY               | PLACEMENT_RECORD        | hires                      | 1:N            | PARTIAL                | TOTAL                  | comp_id             | CASCADE      |
| 5.3             | COMPANY               | COMPANY_VISIT_HISTORY   | visits_campus              | 1:N            | PARTIAL                | TOTAL                  | comp_id             | CASCADE      |
| 6.2             | JOB_PROFILE           | JOB_REQUIRED_SKILL      | requires                   | 1:N            | PARTIAL                | TOTAL                  | job_id              | CASCADE      |
| 6.3             | JOB_PROFILE           | JOB_ELIGIBILITY_BRANCH  | accepts_from               | 1:N            | PARTIAL                | TOTAL                  | job_id              | CASCADE      |
| 6.4             | JOB_PROFILE           | APPLICATION             | receives_applications_from | 1:N            | PARTIAL                | TOTAL                  | job_id              | CASCADE      |
| 6.5             | JOB_PROFILE           | INTERVIEW               | is_evaluated_through       | 1:N            | PARTIAL                | TOTAL                  | job_id              | CASCADE      |
| 6.6             | JOB_PROFILE           | OFFER                   | issues_offers_from         | 1:N            | PARTIAL                | TOTAL                  | job_id              | CASCADE      |
| 6.7             | JOB_PROFILE           | PLACEMENT_RECORD        | results_in_placement       | 1:N            | PARTIAL                | PARTIAL                | job_id              | SET NULL     |
| 10.5            | APPLICATION           | INTERVIEW               | leads_to                   | 1:N (Implicit) | PARTIAL                | PARTIAL                | —                   | —            |
| 10.6            | APPLICATION           | STATUS_AUDIT_LOG        | generates_audit_trail      | 1:N            | PARTIAL                | TOTAL                  | app_id              | CASCADE      |
| 14.2            | RESUME                | RESUME_PARSED_KEYWORD   | contains_keywords          | 1:N            | PARTIAL                | TOTAL                  | resume_id           | CASCADE      |
| 14.3            | RESUME                | RESUME_ANALYSIS_KEYWORD | analyzed_for_keywords      | 1:N            | PARTIAL                | TOTAL                  | resume_id           | CASCADE      |
| 18.2            | COMPANY_VISIT_HISTORY | VISIT_COVERED_STREAM    | covers_streams             | 1:N            | PARTIAL                | TOTAL                  | visit_id            | CASCADE      |

---

## NORMALIZATION ANALYSIS

### First Normal Form (1NF) - Atomic Values

**Violations Fixed**:

- JOB_PROFILE.required_skills (multi-valued text) → JOB_REQUIRED_SKILL (normalized)
- JOB_PROFILE.eligible_branch (multi-valued text) → JOB_ELIGIBILITY_BRANCH (normalized)
- COMPANY_VISIT_HISTORY.streams_covered (multi-valued) → VISIT_COVERED_STREAM (normalized)
- STUDENT.skills (multi-valued) → STUDENT_SKILL (normalized)
- RESUME.keywords_found/keywords_missing (JSON arrays) → RESUME_PARSED_KEYWORD + RESUME_ANALYSIS_KEYWORD (normalized)

### Second Normal Form (2NF) - No Partial Dependencies

- All non-key attributes depend on the ENTIRE primary key
- Composite keys (job_id, skill_name) ensure no attribute depends on just job_id
- Example: JOB_REQUIRED_SKILL.skill_name depends on both job_id AND skill_name in composite key

### Third Normal Form (3NF) - No Transitive Dependencies

**Removed Redundancies**:

- STUDENT.resume_url (derived from RESUME table) → Join with RESUME
- PLACEMENT_RECORD.stream (transitive via STUDENT.dept) → Join with STUDENT
- COMPANY.avg_package_offered (derived/aggregate) → Replaced with SQL View
- COMPANY_VISIT_HISTORY.students_placed (derived/aggregate) → Replaced with SQL View

### Boyce-Codd Normal Form (BCNF) - Every Determinant is a Candidate Key

- USER_ROLE: Removed redundant entity_type column (role determines entity type)
- All tables verified to have non-overlapping functional dependencies
- No hidden functional dependencies affecting candidate keys

---

## PARTICIPATION TYPE LEGEND

| Type        | Definition                                                                        | Example                                                                             |
| ----------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **TOTAL**   | Every entity in parent table MUST have at least one related entity in child table | Every STUDENT MUST have coord_id (must be assigned to coordinator)                  |
| **PARTIAL** | Some entities in parent table may NOT have any related entity in child table      | Some COMPANY entities may NOT have any JOB_PROFILE (some companies never post jobs) |

---

## CARDINALITY LEGEND

| Notation | Meaning                                                                                                                                      |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **1:1**  | One-to-One: Each entity in Table A relates to exactly one entity in Table B, and vice versa                                                  |
| **1:N**  | One-to-Many: Each entity in Table A can relate to many entities in Table B, but each entity in Table B relates to only one entity in Table A |
| **M:N**  | Many-to-Many: Each entity in Table A can relate to many entities in Table B, and vice versa (resolved via bridge table like APPLICATION)     |

---

## CONCLUSION

The Student Placement Database Management System employs a comprehensive relational design with:

✅ **22 normalized tables** achieving BCNF/3NF compliance  
✅ **Strategic composite keys** for multi-valued attributes (1NF compliance)  
✅ **Polymorphic references** for flexible role-based access (USER_ROLE, NOTIFICATION, CHAT_MESSAGE)  
✅ **Bridge tables** resolving M:N relationships (APPLICATION, JOB_REQUIRED_SKILL, JOB_ELIGIBILITY_BRANCH, VISIT_COVERED_STREAM)  
✅ **Trigger-based auditing** for tamper-proof status tracking (STATUS_AUDIT_LOG)  
✅ **Weak entities** with controlled redundancy for audit records (PLACEMENT_RECORD.stream)  
✅ **Referential integrity** with CASCADE and SET NULL rules preventing orphaned records  
✅ **Total and Partial participation** constraints enforcing business logic at schema level
