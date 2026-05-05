# Where Resume Scan History is Stored - Complete Explanation

---

## Current Storage Structure

### Main Table: `RESUME`

```sql
CREATE TABLE RESUME (
    resume_id INT PRIMARY KEY AUTO_INCREMENT,
    s_id INT NOT NULL,
    file_url VARCHAR(255),           -- S3/Cloud storage URL
    uploaded_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ats_score DECIMAL(5,2),          -- Current ATS score
    version_label VARCHAR(50),        -- e.g., "v1", "v2", "final"
    role_targeted VARCHAR(100),       -- Target role
    keywords_found JSON,              -- Array of keywords
    keywords_missing JSON,            -- Array of missing keywords
    is_active BOOLEAN DEFAULT TRUE,   -- Current version?
    FOREIGN KEY (s_id) REFERENCES STUDENT(s_id),
    INDEX idx_s_id (s_id),
    INDEX idx_ats_score (ats_score)
);
```

### Associated Tables:

#### 1. `RESUME_PARSED_KEYWORD` (Extracted Keywords)
```sql
CREATE TABLE RESUME_PARSED_KEYWORD (
    resume_id INT,
    keyword VARCHAR(100),
    PRIMARY KEY (resume_id, keyword),
    FOREIGN KEY (resume_id) REFERENCES RESUME(resume_id) ON DELETE CASCADE
);
```

#### 2. `STATUS_AUDIT_LOG` (State Changes - Implicit Scan History)
```sql
CREATE TABLE STATUS_AUDIT_LOG (
    log_id INT AUTO_INCREMENT,
    app_id INT NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (app_id, log_id),
    FOREIGN KEY (app_id) REFERENCES APPLICATION(app_id) ON DELETE CASCADE
);
```

---

## How Resume Scan History Works

### What Gets Stored?

```
When student uploads/scans resume:

1. RESUME Table Entry Created:
   ├─ resume_id: 101 (auto-increment)
   ├─ s_id: 5 (student ID)
   ├─ file_url: "s3://bucket/resume_5_v1.pdf"
   ├─ uploaded_on: 2025-01-15 10:30:00
   ├─ ats_score: 78.5
   ├─ version_label: "v1"
   ├─ role_targeted: "SDE"
   └─ is_active: TRUE

2. RESUME_PARSED_KEYWORD Entries Created:
   ├─ (resume_id=101, keyword="Python")
   ├─ (resume_id=101, keyword="SQL")
   ├─ (resume_id=101, keyword="Docker")
   └─ (resume_id=101, keyword="AWS")

3. Multiple Uploads = Multiple RESUME Rows:
   Resume 101: v1 - Score 78.5 - uploaded_on: Jan 15 10:30
   Resume 102: v2 - Score 85.0 - uploaded_on: Jan 18 14:20
   Resume 103: v3 - Score 92.0 - uploaded_on: Jan 22 09:15
```

---

## Querying Resume Scan History

### Query 1: Show All Resumes for a Student (Full History)

```sql
SELECT 
    r.resume_id,
    r.version_label,
    r.uploaded_on,
    r.ats_score,
    r.role_targeted,
    r.is_active,
    GROUP_CONCAT(DISTINCT rpk.keyword SEPARATOR ', ') as keywords
FROM RESUME r
LEFT JOIN RESUME_PARSED_KEYWORD rpk ON r.resume_id = rpk.resume_id
WHERE r.s_id = 5
GROUP BY r.resume_id
ORDER BY r.uploaded_on DESC;

/*
Expected Output:
resume_id | version_label | uploaded_on         | ats_score | role_targeted | is_active | keywords
──────────────────────────────────────────────────────────────────────────────────────────────────
103       | v3            | 2025-01-22 09:15:00 | 92.0      | SDE           | TRUE      | Python, SQL, Docker, AWS, System Design
102       | v2            | 2025-01-18 14:20:00 | 85.0      | SDE           | FALSE     | Python, SQL, Docker
101       | v1            | 2025-01-15 10:30:00 | 78.5      | SDE           | FALSE     | Python, SQL, Docker, AWS
*/
```

### Query 2: Show Score Improvement Over Time

```sql
SELECT 
    r.resume_id,
    r.version_label,
    r.uploaded_on,
    r.ats_score,
    LAG(r.ats_score) OVER (ORDER BY r.uploaded_on) as previous_score,
    (r.ats_score - LAG(r.ats_score) OVER (ORDER BY r.uploaded_on)) as score_change,
    CASE 
        WHEN (r.ats_score - LAG(r.ats_score) OVER (ORDER BY r.uploaded_on)) > 0 
        THEN '📈 Improved'
        WHEN (r.ats_score - LAG(r.ats_score) OVER (ORDER BY r.uploaded_on)) < 0 
        THEN '📉 Declined'
        ELSE 'First Upload'
    END as trend
FROM RESUME r
WHERE r.s_id = 5
ORDER BY r.uploaded_on ASC;

/*
Expected Output:
resume_id | version_label | uploaded_on         | ats_score | previous_score | score_change | trend
────────────────────────────────────────────────────────────────────────────────────────────────────
101       | v1            | 2025-01-15 10:30:00 | 78.5      | NULL           | NULL         | First Upload
102       | v2            | 2025-01-18 14:20:00 | 85.0      | 78.5           | +6.5         | 📈 Improved
103       | v3            | 2025-01-22 09:15:00 | 92.0      | 85.0           | +7.0         | 📈 Improved
*/
```

### Query 3: Show Which Keywords Were Added/Removed

```sql
-- Keywords in v1
SELECT DISTINCT rpk.keyword as keywords_v1
FROM RESUME_PARSED_KEYWORD rpk
WHERE rpk.resume_id = 101

EXCEPT

-- Keywords in v3
SELECT DISTINCT rpk.keyword as keywords_v3
FROM RESUME_PARSED_KEYWORD rpk
WHERE rpk.resume_id = 103;

/*
Removed Keywords:
────────────────
(none - all v1 keywords present in v3)
*/

-- Keywords added from v1 to v3
SELECT DISTINCT rpk.keyword as keywords_added
FROM RESUME_PARSED_KEYWORD rpk
WHERE rpk.resume_id = 103

EXCEPT

SELECT DISTINCT rpk.keyword as keywords_added
FROM RESUME_PARSED_KEYWORD rpk
WHERE rpk.resume_id = 101;

/*
Added Keywords:
───────────────
System Design
*/
```

### Query 4: Latest Resume with All Details

```sql
SELECT 
    r.resume_id,
    r.version_label,
    r.uploaded_on,
    r.ats_score,
    CASE 
        WHEN r.ats_score >= 86 THEN 'A - Excellent'
        WHEN r.ats_score >= 71 THEN 'B - Good'
        WHEN r.ats_score >= 51 THEN 'C - Average'
        WHEN r.ats_score >= 31 THEN 'D - Below Average'
        ELSE 'F - Poor'
    END as grade,
    r.role_targeted,
    r.file_url,
    GROUP_CONCAT(DISTINCT rpk.keyword SEPARATOR ', ') as keywords,
    COUNT(DISTINCT rpk.keyword) as keyword_count
FROM RESUME r
LEFT JOIN RESUME_PARSED_KEYWORD rpk ON r.resume_id = rpk.resume_id
WHERE r.s_id = 5 AND r.is_active = TRUE
GROUP BY r.resume_id;

/*
Expected Output:
resume_id | version_label | uploaded_on         | ats_score | grade         | role_targeted | file_url                      | keywords              | keyword_count
──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
103       | v3            | 2025-01-22 09:15:00 | 92.0      | A - Excellent | SDE           | s3://bucket/resume_5_v3.pdf   | Python, SQL, Docker... | 8
*/
```

---

## Complete Resume Scan History Flow

```
TIMELINE OF RESUME UPLOADS (Data Storage):
═════════════════════════════════════════════════════════════

JAN 15 - FIRST UPLOAD (v1)
├─ Student uploads resume
├─ RESUME table: resume_id=101, ats_score=78.5, is_active=TRUE
├─ RESUME_PARSED_KEYWORD: [Python, SQL, Docker, AWS]
└─ stored_on: 2025-01-15 10:30:00


JAN 18 - UPDATED RESUME (v2)
├─ Student re-uploads improved resume
├─ RESUME table: resume_id=102, ats_score=85.0, is_active=TRUE
│  └─ Previous v1: is_active=FALSE (marked old)
├─ RESUME_PARSED_KEYWORD: [Python, SQL, Docker, AWS, Git]
├─ Score improved: 78.5 → 85.0 (+6.5)
└─ stored_on: 2025-01-18 14:20:00


JAN 22 - FINAL RESUME (v3)
├─ Student uploads final version
├─ RESUME table: resume_id=103, ats_score=92.0, is_active=TRUE
│  └─ Previous v2: is_active=FALSE (marked old)
├─ RESUME_PARSED_KEYWORD: [Python, SQL, Docker, AWS, System Design]
├─ Score improved: 85.0 → 92.0 (+7.0)
└─ stored_on: 2025-01-22 09:15:00

TOTAL HISTORY STORED:
├─ 3 RESUME records (one per upload)
├─ 17 RESUME_PARSED_KEYWORD records (5-6 per resume)
├─ Complete score progression: 78.5 → 85.0 → 92.0
├─ Keyword evolution tracked
└─ Timestamps preserved for all versions
```

---

## Where Each Data Point is Stored

### Resume Metadata
| Data | Table | Column | Example |
|------|-------|--------|---------|
| Upload timestamp | RESUME | uploaded_on | 2025-01-15 10:30:00 |
| ATS score | RESUME | ats_score | 92.0 |
| Resume version | RESUME | version_label | "v3" |
| Target role | RESUME | role_targeted | "SDE" |
| File location | RESUME | file_url | s3://bucket/resume_5_v3.pdf |
| Is current? | RESUME | is_active | TRUE/FALSE |

### Extracted Keywords
| Data | Table | Column | Example |
|------|-------|--------|---------|
| Keyword text | RESUME_PARSED_KEYWORD | keyword | "Python" |
| Which resume | RESUME_PARSED_KEYWORD | resume_id | 103 |
| Keyword count | Query result | COUNT(*) | 8 keywords |

### Score History
| Data | Query | Method |
|------|-------|--------|
| All scores over time | SELECT ats_score FROM RESUME WHERE s_id=? | Multiple RESUME rows |
| Score change | LAG() Window function | Compare current vs previous |
| Grade assignment | CASE statement | Based on score range |
| Best score | SELECT MAX(ats_score) | Compare all versions |

---

## How to Implement Score Tracking Explicitly

If you want to add a dedicated `ATS_SCORE_HISTORY` table for explicit score tracking:

```sql
CREATE TABLE ATS_SCORE_HISTORY (
    history_id INT PRIMARY KEY AUTO_INCREMENT,
    resume_id INT NOT NULL,
    old_score DECIMAL(5,2),
    new_score DECIMAL(5,2),
    score_change DECIMAL(5,2) GENERATED ALWAYS AS (new_score - old_score),
    reason VARCHAR(255),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resume_id) REFERENCES RESUME(resume_id) ON DELETE CASCADE,
    INDEX idx_resume (resume_id),
    INDEX idx_calculated_at (calculated_at)
);

-- Trigger to auto-log score changes
CREATE TRIGGER trg_log_resume_score_change
AFTER UPDATE ON RESUME
FOR EACH ROW
BEGIN
    IF OLD.ats_score != NEW.ats_score THEN
        INSERT INTO ATS_SCORE_HISTORY 
        (resume_id, old_score, new_score, reason)
        VALUES 
        (NEW.resume_id, OLD.ats_score, NEW.ats_score, 'Resume updated');
    END IF;
END;
```

Then query it:
```sql
SELECT 
    history_id,
    resume_id,
    old_score,
    new_score,
    score_change,
    reason,
    calculated_at
FROM ATS_SCORE_HISTORY
WHERE resume_id = 101
ORDER BY calculated_at ASC;
```

---

## Visual Dashboard Display (What Student Sees)

```
RESUME SCAN HISTORY
════════════════════════════════════════════════════════════

📊 YOUR RESUME VERSIONS

Version 3 (Current) ✓
├─ Uploaded: Jan 22, 2025 at 9:15 AM
├─ ATS Score: 92/100 (Grade: A - Excellent)
├─ Keywords Matched: 8/8 (Python, SQL, Docker, AWS, System Design, Git, Kubernetes, React)
├─ Target Role: SDE
└─ Status: Currently used for all applications

Version 2
├─ Uploaded: Jan 18, 2025 at 2:20 PM
├─ ATS Score: 85/100 (Grade: B - Good)
├─ Keywords Matched: 7/8 (Missing: System Design)
├─ Target Role: SDE
└─ Improvement from v1: +6.5 points 📈

Version 1
├─ Uploaded: Jan 15, 2025 at 10:30 AM
├─ ATS Score: 78/100 (Grade: C - Average)
├─ Keywords Matched: 5/8 (Missing: System Design, Kubernetes, React)
├─ Target Role: SDE
└─ Starting version

SCORE PROGRESSION:
78 → 85 → 92 📈 +14 points total improvement!

RECOMMENDATIONS FOR FURTHER IMPROVEMENT:
• You're at Grade A! Your resume is highly competitive.
• Consider adding: Microservices, Distributed Systems
• Focus: You have all core skills for SDE roles.
```

---

## Database Query to Generate This Display

```sql
WITH resume_info AS (
    SELECT 
        r.resume_id,
        r.version_label,
        r.uploaded_on,
        r.ats_score,
        r.role_targeted,
        r.is_active,
        COUNT(DISTINCT rpk.keyword) as keyword_count,
        GROUP_CONCAT(DISTINCT rpk.keyword SEPARATOR ', ') as keywords,
        LAG(r.ats_score) OVER (ORDER BY r.uploaded_on) as prev_score,
        (r.ats_score - LAG(r.ats_score) OVER (ORDER BY r.uploaded_on)) as score_diff
    FROM RESUME r
    LEFT JOIN RESUME_PARSED_KEYWORD rpk ON r.resume_id = rpk.resume_id
    WHERE r.s_id = 5
    GROUP BY r.resume_id
)
SELECT 
    resume_id,
    version_label,
    DATE_FORMAT(uploaded_on, '%b %d, %Y at %h:%i %p') as upload_time,
    ats_score,
    CASE 
        WHEN ats_score >= 86 THEN 'A - Excellent'
        WHEN ats_score >= 71 THEN 'B - Good'
        WHEN ats_score >= 51 THEN 'C - Average'
        WHEN ats_score >= 31 THEN 'D - Below Average'
        ELSE 'F - Poor'
    END as grade,
    keyword_count,
    keywords,
    role_targeted,
    is_active,
    COALESCE(score_diff, 0) as improvement
FROM resume_info
ORDER BY uploaded_on DESC;
```

---

## Summary: Resume Scan History Storage

| Aspect | Details |
|--------|---------|
| **Primary Storage** | RESUME table (one row per upload) |
| **Keywords Storage** | RESUME_PARSED_KEYWORD table (normalized) |
| **Score History** | Multiple RESUME rows (chronological) |
| **Timestamp** | RESUME.uploaded_on column |
| **Version Tracking** | RESUME.version_label + RESUME.is_active |
| **Change Detection** | LAG() window function on ats_score |
| **Access Pattern** | Group by s_id, order by uploaded_on |
| **Current Version** | WHERE is_active = TRUE |
| **Full History** | All rows where s_id matches |

---

## To Display in Frontend

```javascript
// Fetch all resume scans for a student
async function getResumeScanHistory(studentId) {
    const response = await fetch(`/api/student/${studentId}/resume-history`);
    const resumes = await response.json();
    
    // resumes = [
    //   {resume_id: 103, version: "v3", score: 92, date: "Jan 22"},
    //   {resume_id: 102, version: "v2", score: 85, date: "Jan 18"},
    //   {resume_id: 101, version: "v1", score: 78, date: "Jan 15"}
    // ]
    
    // Display in UI
    displayResumVersions(resumes);
    drawScoreProgression(resumes);
}
```

