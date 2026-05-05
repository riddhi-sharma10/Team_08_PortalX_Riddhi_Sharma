# Student Placement Cell Database Management System - Implementation Features

## Viva Preparation Document

---

## 1. REAL-TIME UPDATES

### Database Tables Involved:
- `APPLICATION` - Tracks status changes
- `INTERVIEW` - Interview scheduling updates
- `OFFER` - Offer status changes
- `STATUS_AUDIT_LOG` - Maintains history of all updates

### Implementation:
```sql
-- Trigger that automatically logs status changes
CREATE TRIGGER trg_application_audit
AFTER UPDATE ON APPLICATION
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO STATUS_AUDIT_LOG (app_id, old_status, new_status, changed_at)
        VALUES (OLD.app_id, OLD.status, NEW.status, NOW());
    END IF;
END;
```

### How It Works:
- **Frontend**: Uses WebSocket or polling mechanism to fetch latest status from `/api/application/status/:app_id`
- **Backend**: Triggers automatic audit log entry when status updates via `UPDATE APPLICATION SET status = 'shortlisted'`
- **Real-time Sync**: Frontend listens to database changes and refreshes UI components without page reload
- **Data Storage**: All updates stored in `STATUS_AUDIT_LOG` table with `changed_at` timestamp for tracking history

### Why This Approach:
- Ensures no status update goes untracked
- Provides complete audit trail for compliance
- Enables real-time dashboard refresh for all stakeholders
- Maintains data consistency across all user sessions

---

## 2. SEARCH FUNCTIONALITY

### A. Frontend Search Implementation:

```javascript
// Client-side Search (Vite Frontend)
async function searchJobs(filters) {
    const response = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            company: filters.company,
            role: filters.role,
            minPackage: filters.minPackage,
            skills: filters.skills,
            eligibilityCgpa: filters.cgpa
        })
    });
    return response.json();
}
```

### B. Backend Search Implementation:

```sql
-- Backend SQL Query for Job Search
SELECT DISTINCT jp.job_id, jp.role, c.comp_name, jp.package, 
    GROUP_CONCAT(DISTINCT jrs.skill_name SEPARATOR ', ') as required_skills,
    jp.eligibility_cgpa
FROM JOB_PROFILE jp
JOIN COMPANY c ON jp.comp_id = c.comp_id
LEFT JOIN JOB_REQUIRED_SKILL jrs ON jp.job_id = jrs.job_id
WHERE jp.status = 'open'
    AND c.comp_name LIKE ?
    AND jp.role LIKE ?
    AND jp.package >= ?
    AND jp.eligibility_cgpa <= ?
GROUP BY jp.job_id
ORDER BY jp.package DESC;
```

### Database Tables Involved:
- `JOB_PROFILE` - Core job information
- `COMPANY` - Company details
- `JOB_REQUIRED_SKILL` - Skills mapping
- `JOB_ELIGIBILITY_BRANCH` - Branch eligibility

### Search Filters:
- **Company Name**: Searches across `COMPANY.comp_name`
- **Role**: Filters `JOB_PROFILE.role`
- **Package Range**: Uses `JOB_PROFILE.package`
- **Skills**: Matches against `JOB_REQUIRED_SKILL` junction table
- **CGPA Eligibility**: Compares with `JOB_PROFILE.eligibility_cgpa`

### Why Normalized Junction Tables:
- `JOB_REQUIRED_SKILL` (job_id, skill_name) allows multiple skills per job
- Enables efficient filtering: "Jobs requiring Python AND Java"
- Avoids CSV string parsing, uses indexed lookups instead
- Supports skill-based recommendations

### Why This Approach:
- Separates concerns: Frontend handles UI, Backend handles business logic
- Uses indexed columns for fast filtering
- Parameterized queries prevent SQL injection
- Junction tables enable complex multi-criteria searches

---

## 3. NOTIFICATIONS & CHAT SYSTEM

### Database Tables Involved:
- `NOTIFICATION` - Stores all notifications
- `CHAT_MESSAGE` - Stores chat conversations
- `USER_ROLE` - Links users across system

### Notification Storage:

```sql
-- NOTIFICATION Table Structure
CREATE TABLE NOTIFICATION (
    notif_id INT PRIMARY KEY AUTO_INCREMENT,
    recipient_id INT NOT NULL,
    sender_id INT,
    notif_type ENUM('application_update', 'interview_scheduled', 'offer_received', 'message') NOT NULL,
    title VARCHAR(255),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipient_id) REFERENCES USER_ROLE(user_id)
);

-- Chat Message Table Structure
CREATE TABLE CHAT_MESSAGE (
    message_id INT PRIMARY KEY AUTO_INCREMENT,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    message_text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES USER_ROLE(user_id),
    FOREIGN KEY (receiver_id) REFERENCES USER_ROLE(user_id)
);
```

### Implementation:
- **When Application Status Changes**: Trigger inserts notification record
- **Real-time Delivery**: WebSocket emits notification to connected user
- **Chat History**: Stored in `CHAT_MESSAGE` with timestamps
- **Unread Tracking**: `is_read` flag tracks message status

### Why This Approach:
- Persistent storage ensures no notifications lost
- Supports multiple notification types
- Maintains conversation history for compliance
- Read/unread status helps prioritize urgent messages

---

## 4. REAL-TIME PHOTO SYNC WHEN UPDATED

### Database Tables Involved:
- `STUDENT` - Contains profile info
- `RESUME` - Stores file URLs and metadata

### Implementation:

```sql
-- Resume/Photo Storage
CREATE TABLE RESUME (
    resume_id INT PRIMARY KEY AUTO_INCREMENT,
    s_id INT NOT NULL,
    file_url VARCHAR(255),  -- URL to S3/Cloud Storage
    uploaded_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ats_score DECIMAL(5,2),
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (s_id) REFERENCES STUDENT(s_id)
);
```

### How Photo Sync Works:

1. **Upload Trigger**: Student uploads new photo/resume to cloud storage (AWS S3)
2. **Database Update**: `UPDATE RESUME SET file_url = ?, uploaded_on = NOW() WHERE s_id = ?`
3. **Frontend Detection**: WebSocket listener detects change
4. **Real-time Refresh**: New image URL automatically displayed without reload
5. **Version Control**: `uploaded_on` timestamp tracks when last updated

### Why This Approach:
- Files stored in cloud (S3), only URLs in database
- Reduces database size, improves performance
- Version tracking via `uploaded_on` prevents stale cache issues
- Multiple clients see updated photo simultaneously

---

## 5. DASHBOARD STATUS CHANGING

### Database Tables Involved:
- `APPLICATION` - For application status
- `STUDENT` - For profile status
- `OFFER` - For offer status
- `INTERVIEW` - For interview result status

### Real-time Status Update Flow:

```sql
-- Multi-step transaction for offer acceptance
START TRANSACTION;

-- Step 1: Update offer status
UPDATE OFFER SET offer_status = 'accepted' WHERE offer_id = ?;

-- Step 2: Update student profile status
UPDATE STUDENT SET profile_status = 'placed' WHERE s_id = ?;

-- Step 3: Create placement record
INSERT INTO PLACEMENT_RECORD (s_id, comp_id, job_id, salary_offered, status)
SELECT o.s_id, jp.comp_id, o.job_id, o.ctc, 'confirmed'
FROM OFFER o JOIN JOB_PROFILE jp ON o.job_id = jp.job_id
WHERE o.offer_id = ?;

-- Step 4: Auto-generate notification
INSERT INTO NOTIFICATION (recipient_id, notif_type, title, message)
VALUES (?, 'offer_received', 'Offer Accepted', 'Your offer has been accepted successfully');

COMMIT;
```

### Frontend Dashboard Updates:
- Status badges update: `Applied → Shortlisted → Interview → Selected → Offer → Placed`
- Color coding: Red (Rejected), Yellow (Pending), Green (Accepted)
- Progress bar shows placement pipeline
- Real-time counter: "3 interviews scheduled this week"

### Why This Approach:
- ACID transaction ensures all 4 updates succeed or all fail
- No partial state where student is placed but offer not accepted
- Automatic notification keeps student informed
- Audit trail in `STATUS_AUDIT_LOG` maintains compliance

---

## 6. APPLY NOW FUNCTIONALITY (Disabled After Application)

### Database Tables Involved:
- `APPLICATION` - Tracks all applications
- `JOB_PROFILE` - Job details

### Implementation Logic:

```sql
-- Check if student already applied for this job
SELECT COUNT(*) as already_applied
FROM APPLICATION
WHERE s_id = ? AND job_id = ?;

-- UNIQUE constraint prevents duplicate applications
CREATE TABLE APPLICATION (
    app_id INT PRIMARY KEY AUTO_INCREMENT,
    s_id INT NOT NULL,
    job_id INT NOT NULL,
    applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('applied', 'shortlisted', 'selected', 'rejected') DEFAULT 'applied',
    UNIQUE KEY unique_app (s_id, job_id),  -- Prevents duplicate applications
    FOREIGN KEY (s_id) REFERENCES STUDENT(s_id),
    FOREIGN KEY (job_id) REFERENCES JOB_PROFILE(job_id)
);
```

### Frontend Logic:

```javascript
// Check if apply button should be disabled
async function checkApplicationStatus(studentId, jobId) {
    const response = await fetch(`/api/application/exists/${studentId}/${jobId}`);
    const { exists } = await response.json();
    
    if (exists) {
        document.getElementById('applyBtn').disabled = true;
        document.getElementById('applyBtn').textContent = 'Already Applied';
        document.getElementById('applyBtn').style.backgroundColor = '#cccccc';
    }
}

// Apply now button handler
async function applyNow(jobId) {
    const response = await fetch('/api/application/create', {
        method: 'POST',
        body: JSON.stringify({ s_id: currentStudentId, job_id: jobId })
    });
    
    if (response.ok) {
        // Disable button
        event.target.disabled = true;
        event.target.textContent = 'Already Applied';
    }
}
```

### Why This Approach:
- **UNIQUE Constraint**: Database-level enforcement prevents duplicate records
- **Frontend Validation**: Provides instant user feedback
- **Backend Verification**: Double-check prevents race condition where two requests create duplicates
- **User Experience**: Clear visual feedback shows application already submitted

---

## 7. REAL-TIME COORDINATOR & STUDENT STATUS UPDATES

### Database Tables Involved:
- `INTERVIEW` - Interview details
- `APPLICATION` - Application status
- `STUDENT` - Student profile
- `PLACEMENT_COORDINATOR` - Coordinator details

### Coordinator Updates Student Status:

```sql
-- Coordinator updates interview result
UPDATE INTERVIEW 
SET interview_result = 'pass', interview_date = NOW()
WHERE interview_id = ?;

-- Trigger automatically updates application status
CREATE TRIGGER trg_update_app_status_on_interview
AFTER UPDATE ON INTERVIEW
FOR EACH ROW
BEGIN
    IF NEW.interview_result = 'pass' THEN
        UPDATE APPLICATION 
        SET status = 'selected'
        WHERE s_id = NEW.s_id AND job_id = NEW.job_id;
    ELSEIF NEW.interview_result = 'fail' THEN
        UPDATE APPLICATION 
        SET status = 'rejected'
        WHERE s_id = NEW.s_id AND job_id = NEW.job_id;
    END IF;
END;
```

### Real-time Flow:
1. **Coordinator**: Updates interview result in coordinator dashboard
2. **Database Trigger**: Automatically cascades change to `APPLICATION` status
3. **Notification**: Generated and sent to student
4. **Student Dashboard**: Refreshes via WebSocket, student sees status change instantly
5. **Audit Trail**: Change recorded in `STATUS_AUDIT_LOG`

### Why This Approach:
- **Automation**: Trigger eliminates manual status update steps
- **Consistency**: Ensures Interview result and Application status always aligned
- **Real-time**: Both coordinator and student see changes immediately
- **Audit Trail**: Complete history of who changed what and when

---

## 8. ATS FEATURE INTEGRATION

### Database Tables Involved:
- `RESUME` - Resume file storage
- `RESUME_PARSED_KEYWORD` - Extracted keywords
- `JOB_REQUIRED_SKILL` - Required skills for job
- `APPLICATION` - Application tracking

### ATS Score Calculation Logic:

```sql
-- Calculate ATS score based on keyword matching
SELECT 
    r.resume_id,
    s.s_id,
    s.s_name,
    COUNT(DISTINCT rpk.keyword) as matched_keywords,
    COUNT(DISTINCT jrs.skill_name) as required_keywords,
    ROUND((COUNT(DISTINCT rpk.keyword) / COUNT(DISTINCT jrs.skill_name)) * 100, 2) as ats_score
FROM RESUME r
JOIN STUDENT s ON r.s_id = s.s_id
JOIN RESUME_PARSED_KEYWORD rpk ON r.resume_id = rpk.resume_id
JOIN JOB_REQUIRED_SKILL jrs ON 1=1  -- Cross join to all required skills
WHERE r.resume_id = ? 
GROUP BY r.resume_id, s.s_id, s.s_name;
```

### ATS Algorithm:
```
ATS Score = (Matched Keywords / Total Required Keywords) × 100

Example:
- Job requires: Python, SQL, Docker, AWS, System Design (5 skills)
- Resume has: Python, SQL, Docker (3 matched)
- ATS Score = (3/5) × 100 = 60%
```

### Why This Approach:
- **Objective Scoring**: Automated, unbiased evaluation
- **Keyword Matching**: Compares resume content with job description
- **Normalization**: Uses junction table for reliable skill matching
- **Historical Tracking**: Scores stored for analysis and improvement

---

## 9. PDF PARSING IMPLEMENTATION

### Implementation Process:

```javascript
// Backend PDF Parsing (Node.js)
const pdfParse = require('pdf-parse');
const fs = require('fs');

async function parsePDF(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    
    // Extract text from PDF
    const fullText = data.text;
    
    // Extract keywords using regex patterns
    const keywords = extractKeywords(fullText);
    
    return {
        text: fullText,
        keywords: keywords,
        pages: data.numpages
    };
}

function extractKeywords(text) {
    const keywordPatterns = {
        'Python': /python/gi,
        'Java': /java/gi,
        'SQL': /sql/gi,
        'Docker': /docker/gi,
        'AWS': /aws|amazon/gi,
        'React': /react/gi
    };
    
    const extractedKeywords = [];
    for (const [keyword, pattern] of Object.entries(keywordPatterns)) {
        if (pattern.test(text)) {
            extractedKeywords.push(keyword);
        }
    }
    return extractedKeywords;
}
```

### Storage Process:

```sql
-- Step 1: Store resume file URL and calculate initial score
INSERT INTO RESUME (s_id, file_url, ats_score, role_targeted)
VALUES (?, ?, ?, ?)
ON UPDATE ats_score = ?;

-- Step 2: Extract and store parsed keywords
INSERT INTO RESUME_PARSED_KEYWORD (resume_id, keyword)
VALUES 
    (?, 'Python'),
    (?, 'SQL'),
    (?, 'Docker');
```

### Why This Approach:
- **pdf-parse library**: Converts PDF to machine-readable text
- **Regex Matching**: Identifies technical keywords in resume text
- **Persistent Storage**: Keywords stored in junction table for searching
- **Reusability**: Keywords can be matched against multiple job descriptions

---

## 10. SCAN HISTORY STORAGE

### Database Table Structure:

```sql
CREATE TABLE RESUME_SCAN_HISTORY (
    scan_id INT PRIMARY KEY AUTO_INCREMENT,
    resume_id INT NOT NULL,
    scan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ats_score_obtained DECIMAL(5,2),
    keywords_found INT,
    job_matched_count INT,
    scanner_type ENUM('initial', 'reupload', 'improvement_track') DEFAULT 'initial',
    FOREIGN KEY (resume_id) REFERENCES RESUME(resume_id) ON DELETE CASCADE
);
```

### What Gets Stored:
- **scan_date**: When resume was scanned
- **ats_score_obtained**: ATS score at that time
- **keywords_found**: Number of matched keywords
- **job_matched_count**: How many job descriptions matched
- **scanner_type**: Whether initial upload or re-upload for tracking improvement

### Query to Track Student Progress:

```sql
-- Student can see their resume scanning history
SELECT 
    rsh.scan_date,
    rsh.ats_score_obtained,
    rsh.keywords_found,
    rsh.job_matched_count,
    (rsh.ats_score_obtained - LAG(rsh.ats_score_obtained) 
        OVER (ORDER BY rsh.scan_date)) as score_improvement
FROM RESUME_SCAN_HISTORY rsh
WHERE rsh.resume_id = ?
ORDER BY rsh.scan_date DESC;
```

### Why This Approach:
- **Improvement Tracking**: Student sees score trend over time
- **Motivation**: Visible progress encourages resume refinement
- **Analytics**: Coordinators identify common skill gaps
- **Compliance**: Audit trail for placement activities

---

## 11. SCORE INCREMENT & DECREMENT CALCULATION & RECORDING

### ATS Score Recalculation:

```sql
-- Calculate new ATS score when resume updated
UPDATE RESUME 
SET ats_score = (
    SELECT ROUND((COUNT(DISTINCT rpk.keyword) / 
                  (SELECT COUNT(DISTINCT jrs.skill_name 
                   FROM JOB_REQUIRED_SKILL jrs 
                   WHERE jrs.job_id = ?) -- For specific job
                  ) * 100, 2)
    FROM RESUME_PARSED_KEYWORD rpk
    WHERE rpk.resume_id = ?
)
WHERE resume_id = ?;
```

### Storage of Score Changes:

```sql
-- Log every score change
CREATE TABLE ATS_SCORE_HISTORY (
    history_id INT PRIMARY KEY AUTO_INCREMENT,
    resume_id INT NOT NULL,
    old_score DECIMAL(5,2),
    new_score DECIMAL(5,2),
    score_change_reason VARCHAR(255),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resume_id) REFERENCES RESUME(resume_id)
);

-- Trigger to auto-record score changes
CREATE TRIGGER trg_log_ats_score_change
AFTER UPDATE ON RESUME
FOR EACH ROW
BEGIN
    IF OLD.ats_score != NEW.ats_score THEN
        INSERT INTO ATS_SCORE_HISTORY (resume_id, old_score, new_score, score_change_reason)
        VALUES (NEW.resume_id, OLD.ats_score, NEW.ats_score, 'Resume content updated');
    END IF;
END;
```

### Example Increment/Decrement:

```
Scenario 1 - INCREMENT:
Before: Resume had [Python, SQL] → ATS Score = 40%
After: Resume updated with [Python, SQL, Docker, AWS] → ATS Score = 80%
Change: +40% (Positive improvement)
Record: INSERT INTO ATS_SCORE_HISTORY (40, 80, 'New skills added')

Scenario 2 - DECREMENT:
Before: Resume had all skills → ATS Score = 90%
After: Student removed some keywords accidentally → ATS Score = 60%
Change: -30% (Negative impact)
Record: INSERT INTO ATS_SCORE_HISTORY (90, 60, 'Keywords removed')
```

### Why This Approach:
- **Transparency**: Student sees exact impact of resume changes
- **Data Integrity**: Trigger ensures automatic tracking
- **Analysis**: Coordinators identify which changes improve scores
- **Feedback**: Data shows which skills are most valuable

---

## 12. ANALYSIS GRADE RANGE STORAGE

### Database Table for Grade Analysis:

```sql
CREATE TABLE ATS_GRADE_ANALYSIS (
    analysis_id INT PRIMARY KEY AUTO_INCREMENT,
    score_range_min INT,
    score_range_max INT,
    grade CHAR(1),
    grade_description VARCHAR(100),
    recommended_action VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_score_range (score_range_min, score_range_max)
);

-- Populate grade ranges
INSERT INTO ATS_GRADE_ANALYSIS VALUES
(NULL, 0, 30, 'F', 'Poor Resume', 'Major revision needed', NOW()),
(NULL, 31, 50, 'D', 'Below Average', 'Add more relevant skills', NOW()),
(NULL, 51, 70, 'C', 'Average', 'Moderate improvements suggested', NOW()),
(NULL, 71, 85, 'B', 'Good', 'Resume is competitive', NOW()),
(NULL, 86, 100, 'A', 'Excellent', 'Resume is highly optimized', NOW());
```

### Query to Assign Grade:

```sql
-- Assign grade based on ATS score
SELECT 
    r.resume_id,
    r.ats_score,
    aga.grade,
    aga.grade_description,
    aga.recommended_action
FROM RESUME r
JOIN ATS_GRADE_ANALYSIS aga ON 
    r.ats_score BETWEEN aga.score_range_min AND aga.score_range_max
WHERE r.resume_id = ?;
```

### Storage in Resume Record:

```sql
-- Add grade columns to RESUME table
ALTER TABLE RESUME ADD COLUMN (
    grade_assigned CHAR(1),
    grade_date TIMESTAMP
);

-- Store grade when calculated
UPDATE RESUME 
SET grade_assigned = (
    SELECT grade FROM ATS_GRADE_ANALYSIS 
    WHERE ? BETWEEN score_range_min AND score_range_max
),
grade_date = NOW()
WHERE resume_id = ?;
```

### Dashboard Display:

```
Student Resume Analysis:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ATS Score: 78/100
Grade: B (Good)
Description: Resume is competitive
Recommendation: Your resume is strong. Consider adding cloud technologies for better match rate.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Why This Approach:
- **Standardized Assessment**: Same criteria for all students
- **Actionable Feedback**: Recommendations based on score ranges
- **Motivation**: Grade visualization encourages improvement
- **Historical Tracking**: Grade changes recorded over time

---

## 13. KEYWORD MATCHING ALGORITHM

### Keyword Extraction & Matching:

```sql
-- Step 1: Extract keywords from resume
SELECT DISTINCT rpk.keyword
FROM RESUME_PARSED_KEYWORD rpk
WHERE rpk.resume_id = ?;

-- Step 2: Compare with job requirements
SELECT 
    rpk.keyword,
    CASE 
        WHEN rpk.keyword IN (
            SELECT jrs.skill_name 
            FROM JOB_REQUIRED_SKILL jrs 
            WHERE jrs.job_id = ?
        ) THEN 'MATCHED'
        ELSE 'NOT_MATCHED'
    END as match_status
FROM RESUME_PARSED_KEYWORD rpk
WHERE rpk.resume_id = ?
ORDER BY match_status DESC;

-- Step 3: Calculate match score
SELECT 
    COUNT(CASE WHEN match_status = 'MATCHED' THEN 1 END) as matched_count,
    COUNT(*) as total_in_resume,
    (SELECT COUNT(*) FROM JOB_REQUIRED_SKILL WHERE job_id = ?) as required_count,
    ROUND(
        (COUNT(CASE WHEN match_status = 'MATCHED' THEN 1 END) / 
         (SELECT COUNT(*) FROM JOB_REQUIRED_SKILL WHERE job_id = ?)) * 100, 2
    ) as match_percentage
FROM (
    SELECT 
        rpk.keyword,
        CASE 
            WHEN rpk.keyword IN (
                SELECT jrs.skill_name 
                FROM JOB_REQUIRED_SKILL jrs 
                WHERE jrs.job_id = ?
            ) THEN 'MATCHED'
            ELSE 'NOT_MATCHED'
        END as match_status
    FROM RESUME_PARSED_KEYWORD rpk
    WHERE rpk.resume_id = ?
) matching_results;
```

### Matching Logic Example:

```
Job Description (job_id = 5):
Required Skills: [Python, Java, SQL, AWS, Docker]

Resume (resume_id = 10):
Found Keywords: [Python, Java, C++, Git, Docker]

Matching Process:
✓ Python → MATCHED
✓ Java → MATCHED
✗ C++ → NOT REQUIRED (but not penalized)
✓ Docker → MATCHED
✗ Git → NOT IN JOB REQUIREMENTS

Match Score = 3 / 5 = 60%
Interpretation: Resume covers 60% of job requirements
```

### Why This Approach:
- **Normalized Storage**: Junction tables ensure accurate matching
- **Flexible Criteria**: Can weight skills differently
- **Scalable**: Works for any number of skills
- **Accurate**: Keyword extraction from actual PDF content

---

## 14. QUERIES EXPLORER - SQL COMMANDS WITH RESULTS DISPLAY

### Database Table for Query History:

```sql
CREATE TABLE QUERY_EXPLORER_HISTORY (
    query_id INT PRIMARY KEY AUTO_INCREMENT,
    coordinator_id INT NOT NULL,
    sql_query TEXT NOT NULL,
    query_category VARCHAR(50),
    execution_time DECIMAL(10,3),
    row_count_returned INT,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coordinator_id) REFERENCES PLACEMENT_COORDINATOR(coord_id),
    INDEX idx_executed_at (executed_at),
    INDEX idx_category (query_category)
);
```

### Implemented Sample Queries:

#### Query 1: Placement Statistics by Department
```sql
SELECT 
    d.dept_name,
    COUNT(DISTINCT s.s_id) as total_students,
    COUNT(DISTINCT pr.s_id) as placed_students,
    ROUND(COUNT(DISTINCT pr.s_id) / COUNT(DISTINCT s.s_id) * 100, 2) as placement_percentage,
    ROUND(AVG(pr.salary_offered), 2) as avg_package,
    MAX(pr.salary_offered) as highest_package
FROM DEPARTMENT d
LEFT JOIN STUDENT s ON d.dept_id = s.dept_id
LEFT JOIN PLACEMENT_RECORD pr ON s.s_id = pr.s_id 
    AND pr.academic_year = YEAR(CURDATE())
GROUP BY d.dept_id, d.dept_name
ORDER BY placement_percentage DESC;

/* Expected Output:
dept_name          | total_students | placed_students | placement_% | avg_package | highest_package
Computer Science   | 150            | 132             | 88.00       | 11.50       | 18.50
Electronics        | 120            | 98              | 81.67       | 10.25       | 16.00
*/
```

#### Query 2: Top Recruiting Companies
```sql
SELECT 
    c.comp_name,
    COUNT(DISTINCT jp.job_id) as jobs_posted,
    COUNT(DISTINCT a.s_id) as total_applications,
    COUNT(DISTINCT pr.s_id) as students_placed,
    ROUND(AVG(pr.salary_offered), 2) as avg_salary
FROM COMPANY c
LEFT JOIN JOB_PROFILE jp ON c.comp_id = jp.comp_id
LEFT JOIN APPLICATION a ON jp.job_id = a.job_id
LEFT JOIN PLACEMENT_RECORD pr ON c.comp_id = pr.comp_id
WHERE pr.academic_year = YEAR(CURDATE())
GROUP BY c.comp_id, c.comp_name
HAVING students_placed > 0
ORDER BY students_placed DESC
LIMIT 10;

/* Expected Output:
comp_name   | jobs_posted | total_applications | students_placed | avg_salary
Microsoft   | 12          | 450                | 20              | 18.50
Google      | 10          | 380                | 18              | 17.75
Amazon      | 8           | 320                | 15              | 16.25
*/
```

#### Query 3: High-Performing Students
```sql
SELECT 
    s.s_name,
    s.cgpa,
    COUNT(DISTINCT a.job_id) as applications_made,
    COUNT(DISTINCT CASE WHEN a.status = 'selected' THEN a.job_id END) as successful_applications,
    MAX(r.ats_score) as best_ats_score,
    pr.salary_offered as placed_salary
FROM STUDENT s
LEFT JOIN APPLICATION a ON s.s_id = a.s_id
LEFT JOIN RESUME r ON s.s_id = r.s_id
LEFT JOIN PLACEMENT_RECORD pr ON s.s_id = pr.s_id
WHERE pr.status = 'confirmed'
GROUP BY s.s_id, s.s_name, s.cgpa, pr.salary_offered
ORDER BY pr.salary_offered DESC
LIMIT 15;

/* Expected Output:
s_name         | cgpa | applications_made | successful_applications | best_ats_score | placed_salary
Rajesh Kumar   | 8.5  | 18                | 4                       | 92.5           | 18.50
Sneha Sharma   | 8.2  | 12                | 3                       | 88.0           | 17.75
Priya Verma    | 7.8  | 15                | 2                       | 85.5           | 16.50
*/
```

#### Query 4: Skill Gap Analysis
```sql
SELECT 
    sm.skill_name,
    COUNT(DISTINCT jrs.job_id) as jobs_requiring_skill,
    COUNT(DISTINCT ss.s_id) as students_with_skill,
    ROUND((COUNT(DISTINCT ss.s_id) / (SELECT COUNT(*) FROM STUDENT)) * 100, 2) as student_coverage_percentage,
    (SELECT COUNT(*) FROM STUDENT) as total_students
FROM SKILL_MASTER sm
LEFT JOIN JOB_REQUIRED_SKILL jrs ON sm.skill_name = jrs.skill_name
LEFT JOIN STUDENT_SKILL ss ON sm.skill_id = ss.skill_id
GROUP BY sm.skill_id, sm.skill_name
HAVING jobs_requiring_skill > 0
ORDER BY jobs_requiring_skill DESC;

/* Expected Output:
skill_name     | jobs_requiring_skill | students_with_skill | student_coverage_% | total_students
Python         | 45                   | 120                 | 80.00              | 150
SQL            | 42                   | 105                 | 70.00              | 150
Java           | 38                   | 95                  | 63.33              | 150
System Design  | 25                   | 30                  | 20.00              | 150
*/
```

### Frontend Query Explorer Implementation:

```javascript
// Query Explorer UI - Show SQL and Results Side by Side
async function executeQuery(queryId) {
    const response = await fetch(`/api/queries/execute/${queryId}`, {
        method: 'POST'
    });
    
    const { query, results, executionTime, rowCount } = await response.json();
    
    // Display Query
    document.getElementById('sqlQuery').textContent = query;
    
    // Display Results as Table
    const table = createResultsTable(results);
    document.getElementById('resultsContainer').innerHTML = table;
    
    // Display Metadata
    document.getElementById('metadata').innerHTML = `
        Execution Time: ${executionTime}ms | Rows Returned: ${rowCount}
    `;
}
```

### Why This Approach:
- **Pre-built Queries**: Coordinators don't need SQL knowledge
- **Safety**: Only authorized queries can be executed
- **Performance Tracking**: Execution time monitored for optimization
- **Results Display**: Table format makes analysis easy
- **Historical Analysis**: Query history stored for auditing
- **Insights**: Reveals placement trends, skill gaps, company preferences

---

## COMPLETE SYSTEM FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                   STUDENT PLACEMENT SYSTEM                      │
└─────────────────────────────────────────────────────────────────┘

1. STUDENT UPLOADS RESUME
   ↓
   PDF Parsing → Extract Keywords → Store in RESUME_PARSED_KEYWORD
   ↓
2. ATS SCORING STARTS
   ↓
   Match Keywords with Job Requirements
   ↓
   Calculate: (Matched Keywords / Required Keywords) × 100
   ↓
   Store Score in RESUME table
   ↓
3. REAL-TIME UPDATE
   ↓
   Trigger fires → Status logged in STATUS_AUDIT_LOG
   ↓
   WebSocket sends update → Dashboard refreshes
   ↓
4. STUDENT APPLIES FOR JOB
   ↓
   Check: UNIQUE constraint prevents duplicate
   ↓
   Frontend: Disable "Apply Now" button
   ↓
   Notification sent to coordinator
   ↓
5. COORDINATOR REVIEWS APPLICATION
   ↓
   Updates INTERVIEW result
   ↓
   Trigger fires → APPLICATION status updates automatically
   ↓
   Notification sent to student
   ↓
6. REAL-TIME SYNC
   ↓
   Coordinator Dashboard + Student Dashboard both update instantly
   ↓
   Chat/Notifications exchanged
   ↓
7. OFFER ACCEPTANCE (Atomic Transaction)
   ↓
   OFFER status updated
   + STUDENT profile status updated
   + PLACEMENT_RECORD created
   + NOTIFICATION generated
   ↓
   All succeed OR all fail (COMMIT/ROLLBACK)
   ↓
8. ANALYTICS & REPORTING
   ↓
   Query Explorer displays insights
   ↓
   Skill Gap Analysis identifies training needs
   ↓
   Placement trends tracked over time
```

---

## KEY DESIGN DECISIONS & WHY

| Feature | Technology Choice | Why This? |
|---------|------------------|-----------|
| **Real-time Updates** | WebSocket + Database Triggers | Instant sync without polling overhead |
| **Search** | Normalized Junction Tables + Indexed Queries | Fast multi-criteria filtering |
| **Notifications** | Persistent table + Event emitters | No messages lost, supports offline users |
| **Photo Sync** | Cloud Storage (S3) + URL in DB | Reduces DB size, enables versioning |
| **Apply Disabling** | UNIQUE constraint + Frontend check | Database enforcement + UX feedback |
| **ATS Scoring** | Keyword matching algorithm | Objective, unbiased evaluation |
| **PDF Parsing** | pdf-parse library + Regex extraction | Accurate keyword identification |
| **Score Tracking** | Separate history table + Triggers | Transparent improvement tracking |
| **Grade Ranges** | Reference table lookup | Scalable, easily adjustable criteria |
| **Keyword Matching** | RESUME_PARSED_KEYWORD junction table | Enables complex multi-skill queries |
| **Query Explorer** | Pre-built + Parameterized queries | Safe, performant, user-friendly analytics |

---

## CONCLUSION

All features work together in an integrated ecosystem where:
- **Database** enforces integrity via constraints and triggers
- **Backend** orchestrates business logic via stored procedures
- **Frontend** provides real-time UI updates via WebSocket
- **Automation** reduces manual errors and ensures consistency
- **Analytics** provide actionable insights for stakeholders

