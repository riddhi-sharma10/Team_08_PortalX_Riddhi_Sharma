# ER RELATIONSHIPS - TABLE-BY-TABLE TEXTUAL FORMAT

## TABLE 1: CGDC_ADMIN

**Relationships:**

1. **CGDC_ADMIN → PLACEMENT_COORDINATOR**
   - Relationship Name: "supervises"
   - Cardinality: 1:N (One CGDC_ADMIN supervises many PLACEMENT_COORDINATORs)
   - CGDC_ADMIN Dependency: TOTAL (Every CGDC_ADMIN must supervise at least one coordinator)
   - PLACEMENT_COORDINATOR Dependency: TOTAL (Every coordinator must be supervised by exactly one CGDC_ADMIN)
   - Foreign Key: PLACEMENT_COORDINATOR.cgdc_id

---

## TABLE 2: PLACEMENT_COORDINATOR

**Relationships:**

1. **PLACEMENT_COORDINATOR ← CGDC_ADMIN** (reverse of TABLE 1)
   - Relationship Name: "is_supervised_by"
   - Cardinality: N:1
   - PLACEMENT_COORDINATOR Dependency: TOTAL

2. **PLACEMENT_COORDINATOR → STUDENT**
   - Relationship Name: "coordinates"
   - Cardinality: 1:N (One PLACEMENT_COORDINATOR coordinates many STUDENTs)
   - PLACEMENT_COORDINATOR Dependency: PARTIAL (A coordinator may have no students assigned)
   - STUDENT Dependency: TOTAL (Every STUDENT must be assigned to exactly one PLACEMENT_COORDINATOR)
   - Foreign Key: STUDENT.coord_id

3. **PLACEMENT_COORDINATOR → APPLICATION**
   - Relationship Name: "manages"
   - Cardinality: 1:N (One PLACEMENT_COORDINATOR manages many APPLICATIONs)
   - PLACEMENT_COORDINATOR Dependency: PARTIAL (Not all coordinators manage applications)
   - APPLICATION Dependency: PARTIAL (Not all applications are assigned to a coordinator)
   - Foreign Key: APPLICATION.assigned_coord_id

---

## TABLE 3: STUDENT

**Relationships:**

1. **STUDENT ← PLACEMENT_COORDINATOR** (reverse of TABLE 2)
   - Relationship Name: "is_coordinated_by"
   - Cardinality: N:1
   - STUDENT Dependency: TOTAL

2. **STUDENT → USER_ROLE**
   - Relationship Name: "has_account"
   - Cardinality: 1:1 (One STUDENT has exactly one USER_ROLE login account)
   - STUDENT Dependency: TOTAL (Every STUDENT must have a login account)
   - USER_ROLE Dependency: PARTIAL (Not all USER_ROLE records are students)
   - Note: Polymorphic reference (no direct FK constraint)

3. **STUDENT → RESUME**
   - Relationship Name: "uploads"
   - Cardinality: 1:N (One STUDENT uploads multiple RESUMEs across versions)
   - STUDENT Dependency: PARTIAL (Some students may not upload resumes)
   - RESUME Dependency: TOTAL (Every RESUME belongs to exactly one STUDENT)
   - Foreign Key: RESUME.s_id

4. **STUDENT → APPLICATION**
   - Relationship Name: "applies_to"
   - Cardinality: 1:N (One STUDENT submits multiple APPLICATIONs)
   - STUDENT Dependency: PARTIAL (Some students may not apply to any job)
   - APPLICATION Dependency: TOTAL (Every APPLICATION is from exactly one STUDENT)
   - Foreign Key: APPLICATION.s_id

5. **STUDENT → INTERVIEW**
   - Relationship Name: "attends"
   - Cardinality: 1:N (One STUDENT attends multiple INTERVIEWs)
   - STUDENT Dependency: PARTIAL (Some students may not attend interviews)
   - INTERVIEW Dependency: TOTAL (Every INTERVIEW is for exactly one STUDENT)
   - Foreign Key: INTERVIEW.s_id

6. **STUDENT → OFFER**
   - Relationship Name: "receives"
   - Cardinality: 1:N (One STUDENT receives multiple OFFERs)
   - STUDENT Dependency: PARTIAL (Not all students receive offers)
   - OFFER Dependency: TOTAL (Every OFFER is issued to exactly one STUDENT)
   - Foreign Key: OFFER.s_id

7. **STUDENT → PLACEMENT_RECORD**
   - Relationship Name: "secures_placement"
   - Cardinality: 1:N (One STUDENT can have multiple PLACEMENT_RECORDs)
   - STUDENT Dependency: PARTIAL (Not all students secure placement)
   - PLACEMENT_RECORD Dependency: TOTAL (Every PLACEMENT_RECORD is for exactly one STUDENT)
   - Foreign Key: PLACEMENT_RECORD.s_id

8. **STUDENT → STUDENT_SKILL**
   - Relationship Name: "possesses"
   - Cardinality: 1:N (One STUDENT possesses multiple SKILLs)
   - STUDENT Dependency: PARTIAL (Some students may have no skills recorded)
   - STUDENT_SKILL Dependency: TOTAL (Every skill record belongs to exactly one STUDENT)
   - Foreign Key: STUDENT_SKILL.s_id

---

## TABLE 4: USER_ROLE

**Relationships:**

1. **USER_ROLE ← STUDENT** (reverse of TABLE 3, Relationship 2)
   - Relationship Name: "authenticates"
   - Cardinality: 1:1
   - USER_ROLE Dependency: PARTIAL

2. **USER_ROLE ← PLACEMENT_COORDINATOR**
   - Relationship Name: "authenticates"
   - Cardinality: 1:1
   - USER_ROLE Dependency: PARTIAL

3. **USER_ROLE ← CGDC_ADMIN**
   - Relationship Name: "authenticates"
   - Cardinality: 1:1
   - USER_ROLE Dependency: PARTIAL

4. **USER_ROLE ← NOTIFICATION** (reverse of TABLE 20, Relationship 1)
   - Relationship Name: "receives_notifications"
   - Cardinality: 1:N (One USER_ROLE receives multiple NOTIFICATIONs)
   - USER_ROLE Dependency: PARTIAL (Not all users receive notifications)

5. **USER_ROLE ← CHAT_MESSAGE (As Sender)** (reverse of TABLE 21, Relationship 1)
   - Relationship Name: "sends_messages"
   - Cardinality: 1:N (One USER_ROLE sends multiple CHAT_MESSAGEs)
   - USER_ROLE Dependency: PARTIAL (Not all users send messages)

6. **USER_ROLE ← CHAT_MESSAGE (As Receiver)** (reverse of TABLE 21, Relationship 2)
   - Relationship Name: "receives_messages"
   - Cardinality: 1:N (One USER_ROLE receives multiple CHAT_MESSAGEs)
   - USER_ROLE Dependency: PARTIAL (Not all users receive messages)

---

## TABLE 5: COMPANY

**Relationships:**

1. **COMPANY → JOB_PROFILE**
   - Relationship Name: "posts"
   - Cardinality: 1:N (One COMPANY posts multiple JOB_PROFILEs)
   - COMPANY Dependency: PARTIAL (Some companies may not post jobs)
   - JOB_PROFILE Dependency: TOTAL (Every JOB_PROFILE belongs to exactly one COMPANY)
   - Foreign Key: JOB_PROFILE.comp_id

2. **COMPANY → PLACEMENT_RECORD**
   - Relationship Name: "hires"
   - Cardinality: 1:N (One COMPANY hires multiple STUDENTs)
   - COMPANY Dependency: PARTIAL (Some companies may not place anyone)
   - PLACEMENT_RECORD Dependency: TOTAL (Every PLACEMENT_RECORD is from exactly one COMPANY)
   - Foreign Key: PLACEMENT_RECORD.comp_id

3. **COMPANY → COMPANY_VISIT_HISTORY**
   - Relationship Name: "visits_campus"
   - Cardinality: 1:N (One COMPANY visits campus multiple times across years)
   - COMPANY Dependency: PARTIAL (First-time recruiters may have only one visit)
   - COMPANY_VISIT_HISTORY Dependency: TOTAL (Every visit is by exactly one COMPANY)
   - Foreign Key: COMPANY_VISIT_HISTORY.comp_id

---

## TABLE 6: JOB_PROFILE

**Relationships:**

1. **JOB_PROFILE ← COMPANY** (reverse of TABLE 5, Relationship 1)
   - Relationship Name: "is_posted_by"
   - Cardinality: N:1
   - JOB_PROFILE Dependency: TOTAL

2. **JOB_PROFILE → JOB_REQUIRED_SKILL**
   - Relationship Name: "requires"
   - Cardinality: 1:N (One JOB_PROFILE requires multiple SKILLs)
   - JOB_PROFILE Dependency: PARTIAL (Some generic roles may not have specific skills)
   - JOB_REQUIRED_SKILL Dependency: TOTAL (Every skill record belongs to exactly one JOB_PROFILE)
   - Foreign Key: JOB_REQUIRED_SKILL.job_id
   - Note: Composite Primary Key (job_id, skill_name)

3. **JOB_PROFILE → JOB_ELIGIBILITY_BRANCH**
   - Relationship Name: "accepts_from"
   - Cardinality: 1:N (One JOB_PROFILE accepts applications from multiple BRANCHes)
   - JOB_PROFILE Dependency: PARTIAL (Some roles may be open to all branches)
   - JOB_ELIGIBILITY_BRANCH Dependency: TOTAL (Every branch record belongs to exactly one JOB_PROFILE)
   - Foreign Key: JOB_ELIGIBILITY_BRANCH.job_id
   - Note: Composite Primary Key (job_id, branch_name)

4. **JOB_PROFILE → APPLICATION**
   - Relationship Name: "receives_applications_from"
   - Cardinality: 1:N (One JOB_PROFILE receives multiple APPLICATIONs)
   - JOB_PROFILE Dependency: PARTIAL (Some roles may receive no applications)
   - APPLICATION Dependency: TOTAL (Every APPLICATION is for exactly one JOB_PROFILE)
   - Foreign Key: APPLICATION.job_id

5. **JOB_PROFILE → INTERVIEW**
   - Relationship Name: "is_evaluated_through"
   - Cardinality: 1:N (One JOB_PROFILE has multiple INTERVIEWs)
   - JOB_PROFILE Dependency: PARTIAL (Not all jobs progress to interviews)
   - INTERVIEW Dependency: TOTAL (Every INTERVIEW is for exactly one JOB_PROFILE)
   - Foreign Key: INTERVIEW.job_id

6. **JOB_PROFILE → OFFER**
   - Relationship Name: "issues_offers_from"
   - Cardinality: 1:N (One JOB_PROFILE issues multiple OFFERs)
   - JOB_PROFILE Dependency: PARTIAL (Some positions may not issue offers)
   - OFFER Dependency: TOTAL (Every OFFER is for exactly one JOB_PROFILE)
   - Foreign Key: OFFER.job_id

7. **JOB_PROFILE → PLACEMENT_RECORD**
   - Relationship Name: "results_in_placement"
   - Cardinality: 1:N (One JOB_PROFILE results in multiple PLACEMENTs)
   - JOB_PROFILE Dependency: PARTIAL (Not all job profiles result in placements)
   - PLACEMENT_RECORD Dependency: PARTIAL (Placement may exist without a specific job_id - referral hires)
   - Foreign Key: PLACEMENT_RECORD.job_id (Optional/Can be NULL)

---

## TABLE 7: JOB_REQUIRED_SKILL

**Relationships:**

1. **JOB_REQUIRED_SKILL ← JOB_PROFILE** (reverse of TABLE 6, Relationship 2)
   - Relationship Name: "has_required_skills"
   - Cardinality: N:1
   - JOB_REQUIRED_SKILL Dependency: TOTAL

---

## TABLE 8: JOB_ELIGIBILITY_BRANCH

**Relationships:**

1. **JOB_ELIGIBILITY_BRANCH ← JOB_PROFILE** (reverse of TABLE 6, Relationship 3)
   - Relationship Name: "has_eligible_branches"
   - Cardinality: N:1
   - JOB_ELIGIBILITY_BRANCH Dependency: TOTAL

---

## TABLE 9: DEPARTMENT

**Relationships:**

No direct relationships defined in the current schema. (Lookup/Reference table)

---

## TABLE 10: APPLICATION

**Relationships:**

1. **APPLICATION ← STUDENT** (reverse of TABLE 3, Relationship 4)
   - Relationship Name: "is_application_from"
   - Cardinality: N:1
   - APPLICATION Dependency: TOTAL

2. **APPLICATION ← JOB_PROFILE** (reverse of TABLE 6, Relationship 4)
   - Relationship Name: "is_application_for"
   - Cardinality: N:1
   - APPLICATION Dependency: TOTAL

3. **APPLICATION ← PLACEMENT_COORDINATOR** (reverse of TABLE 2, Relationship 3)
   - Relationship Name: "is_managed_by"
   - Cardinality: N:1
   - APPLICATION Dependency: PARTIAL

4. **APPLICATION → STATUS_AUDIT_LOG**
   - Relationship Name: "generates_audit_trail"
   - Cardinality: 1:N (One APPLICATION generates multiple audit log entries as status changes)
   - APPLICATION Dependency: PARTIAL (Static applications may have few log entries)
   - STATUS_AUDIT_LOG Dependency: TOTAL (Every log entry belongs to exactly one APPLICATION)
   - Foreign Key: STATUS_AUDIT_LOG.app_id

---

## TABLE 11: INTERVIEW

**Relationships:**

1. **INTERVIEW ← STUDENT** (reverse of TABLE 3, Relationship 5)
   - Relationship Name: "is_interview_for"
   - Cardinality: N:1
   - INTERVIEW Dependency: TOTAL

2. **INTERVIEW ← JOB_PROFILE** (reverse of TABLE 6, Relationship 5)
   - Relationship Name: "is_evaluated_through"
   - Cardinality: N:1
   - INTERVIEW Dependency: TOTAL

---

## TABLE 12: OFFER

**Relationships:**

1. **OFFER ← STUDENT** (reverse of TABLE 3, Relationship 6)
   - Relationship Name: "is_offer_to"
   - Cardinality: N:1
   - OFFER Dependency: TOTAL

2. **OFFER ← JOB_PROFILE** (reverse of TABLE 6, Relationship 6)
   - Relationship Name: "is_offer_from"
   - Cardinality: N:1
   - OFFER Dependency: TOTAL

---

## TABLE 13: PLACEMENT_RECORD

**Relationships:**

1. **PLACEMENT_RECORD ← STUDENT** (reverse of TABLE 3, Relationship 7)
   - Relationship Name: "has_placement_record"
   - Cardinality: N:1
   - PLACEMENT_RECORD Dependency: TOTAL

2. **PLACEMENT_RECORD ← COMPANY** (reverse of TABLE 5, Relationship 2)
   - Relationship Name: "recorded_hire_from"
   - Cardinality: N:1
   - PLACEMENT_RECORD Dependency: TOTAL

3. **PLACEMENT_RECORD ← JOB_PROFILE** (reverse of TABLE 6, Relationship 7)
   - Relationship Name: "source_job_for_placement"
   - Cardinality: N:1
   - PLACEMENT_RECORD Dependency: PARTIAL (Placement may be through referral without job_id)

---

## TABLE 14: RESUME

**Relationships:**

1. **RESUME ← STUDENT** (reverse of TABLE 3, Relationship 3)
   - Relationship Name: "owns_resume"
   - Cardinality: N:1
   - RESUME Dependency: TOTAL

2. **RESUME → RESUME_PARSED_KEYWORD**
   - Relationship Name: "contains_keywords"
   - Cardinality: 1:N (One RESUME contains multiple extracted KEYWORDs)
   - RESUME Dependency: PARTIAL (Some resumes may have no parsed keywords)
   - RESUME_PARSED_KEYWORD Dependency: TOTAL (Every keyword record belongs to exactly one RESUME)
   - Foreign Key: RESUME_PARSED_KEYWORD.resume_id
   - Note: Composite Primary Key (resume_id, keyword)

3. **RESUME → RESUME_ANALYSIS_KEYWORD**
   - Relationship Name: "analyzed_for_keywords"
   - Cardinality: 1:N (One RESUME is analyzed for multiple KEYWORDs)
   - RESUME Dependency: PARTIAL (Not all resumes undergo keyword analysis)
   - RESUME_ANALYSIS_KEYWORD Dependency: TOTAL (Every analysis keyword belongs to exactly one RESUME)
   - Foreign Key: RESUME_ANALYSIS_KEYWORD.analysis_id
   - Note: Composite Primary Key (analysis_id, keyword)

---

## TABLE 15: RESUME_ANALYSIS_KEYWORD

**Relationships:**

1. **RESUME_ANALYSIS_KEYWORD ← RESUME** (reverse of TABLE 14, Relationship 3)
   - Relationship Name: "contains_analyzed_keywords"
   - Cardinality: N:1
   - RESUME_ANALYSIS_KEYWORD Dependency: TOTAL

---

## TABLE 16: RESUME_PARSED_KEYWORD

**Relationships:**

1. **RESUME_PARSED_KEYWORD ← RESUME** (reverse of TABLE 14, Relationship 2)
   - Relationship Name: "has_parsed_keywords"
   - Cardinality: N:1
   - RESUME_PARSED_KEYWORD Dependency: TOTAL

---

## TABLE 17: STUDENT_SKILL

**Relationships:**

1. **STUDENT_SKILL ← STUDENT** (reverse of TABLE 3, Relationship 8)
   - Relationship Name: "has_proficiency_in"
   - Cardinality: N:1
   - STUDENT_SKILL Dependency: TOTAL

---

## TABLE 18: COMPANY_VISIT_HISTORY

**Relationships:**

1. **COMPANY_VISIT_HISTORY ← COMPANY** (reverse of TABLE 5, Relationship 3)
   - Relationship Name: "has_visit_history"
   - Cardinality: N:1
   - COMPANY_VISIT_HISTORY Dependency: TOTAL

2. **COMPANY_VISIT_HISTORY → VISIT_COVERED_STREAM**
   - Relationship Name: "covers_streams"
   - Cardinality: 1:N (One campus VISIT covers multiple STREAMS/departments)
   - COMPANY_VISIT_HISTORY Dependency: PARTIAL (Some visits may not have stream coverage recorded)
   - VISIT_COVERED_STREAM Dependency: TOTAL (Every stream record belongs to exactly one visit)
   - Foreign Key: VISIT_COVERED_STREAM.visit_id
   - Note: Composite Primary Key (visit_id, stream_name)

---

## TABLE 19: VISIT_COVERED_STREAM

**Relationships:**

1. **VISIT_COVERED_STREAM ← COMPANY_VISIT_HISTORY** (reverse of TABLE 18, Relationship 2)
   - Relationship Name: "has_stream_coverage"
   - Cardinality: N:1
   - VISIT_COVERED_STREAM Dependency: TOTAL

---

## TABLE 20: NOTIFICATION

**Relationships:**

1. **NOTIFICATION → USER_ROLE** (Polymorphic reference)
   - Relationship Name: "sent_to"
   - Cardinality: N:1 (Many NOTIFICATIONs to one USER_ROLE)
   - NOTIFICATION Dependency: PARTIAL (Some notifications may not have user assigned)
   - USER_ROLE Dependency: PARTIAL (Not all USER_ROLE records have notifications)
   - Foreign Key: NOTIFICATION.user_id → USER_ROLE.user_id
   - Note: Polymorphic design - user_role column identifies which entity type (student, coordinator, admin)

---

## TABLE 21: CHAT_MESSAGE

**Relationships:**

1. **CHAT_MESSAGE → USER_ROLE (Sender)** (Polymorphic reference)
   - Relationship Name: "sent_by"
   - Cardinality: N:1 (Many messages from one USER_ROLE sender)
   - CHAT_MESSAGE Dependency: PARTIAL (Some messages may not have sender assigned)
   - USER_ROLE Dependency: PARTIAL (Not all USER_ROLE records send messages)
   - Foreign Key: CHAT_MESSAGE.sender_id → USER_ROLE.user_id
   - Note: Polymorphic - sender_role column identifies entity type (student, coordinator, admin)

2. **CHAT_MESSAGE → USER_ROLE (Receiver)** (Polymorphic reference)
   - Relationship Name: "sent_to"
   - Cardinality: N:1 (Many messages to one USER_ROLE receiver)
   - CHAT_MESSAGE Dependency: PARTIAL (Some messages may not have receiver assigned)
   - USER_ROLE Dependency: PARTIAL (Not all USER_ROLE records receive messages)
   - Foreign Key: CHAT_MESSAGE.receiver_id → USER_ROLE.user_id
   - Note: Polymorphic - receiver_role column identifies entity type (student, coordinator, admin)

---

## TABLE 22: STATUS_AUDIT_LOG

**Relationships:**

1. **STATUS_AUDIT_LOG ← APPLICATION** (reverse of TABLE 10, Relationship 4)
   - Relationship Name: "has_audit_trail"
   - Cardinality: N:1
   - STATUS_AUDIT_LOG Dependency: TOTAL
