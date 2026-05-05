# Filtering Strategy in Tables - Complete Explanation

---

## Overview: What is Table Filtering?

**Filtering** = Retrieving specific rows from a table based on conditions/criteria

```
Without Filtering:
SELECT * FROM STUDENT;
Result: ALL 500 students (too much data)

With Filtering:
SELECT * FROM STUDENT WHERE cgpa >= 7.0 AND profile_status = 'active';
Result: 120 students who meet criteria (useful data)
```

---

## 1. SIMPLE FILTERING (Single Condition)

### Example 1: Filter Students by CGPA

```sql
-- Find all students with CGPA >= 7.0
SELECT s_id, s_name, cgpa, dept_id
FROM STUDENT
WHERE cgpa >= 7.0;

-- Index Used: idx_cgpa (s_id)
-- Query Time: ~5ms (with index)
```

**How It Works:**
```
Database has Index on CGPA column:
┌─────────────────────────┐
│ Index: idx_cgpa         │
├─────────────────────────┤
│ 6.0  → rows: 2, 15, 89  │
│ 6.5  → rows: 5, 23, 45  │
│ 7.0  → rows: 12, 34, 67 │
│ 7.5  → rows: 8, 42, 91  │
│ 8.0  → rows: 1, 18, 56  │
│ 8.5  → rows: 3, 44, 78  │
└─────────────────────────┘

Query: WHERE cgpa >= 7.0
Steps:
1. Look in index at value 7.0
2. Get all rows: [12, 34, 67, 8, 42, 91, 1, 18, 56, 3, 44, 78]
3. Fetch only those rows from table
4. Return to user

Result: FAST (index lookup)
```

### Example 2: Filter Applications by Status

```sql
-- Find all shortlisted applications
SELECT app_id, s_id, job_id, applied_date
FROM APPLICATION
WHERE status = 'shortlisted';

-- Index Used: idx_status (app_id)
-- Query Time: ~2ms
```

### Example 3: Filter Companies by Tier

```sql
-- Find all Tier 1 companies
SELECT comp_id, comp_name, avg_package_offered
FROM COMPANY
WHERE tier = 'Tier 1'
ORDER BY avg_package_offered DESC;

-- Index Used: idx_tier (comp_id)
-- Query Time: ~3ms
```

---

## 2. COMPOSITE FILTERING (Multiple Conditions)

### Example 1: Find Eligible Students for a Job

```sql
-- Job requires: CGPA >= 6.0, CSE/ECE dept, status = 'active'
SELECT s_id, s_name, cgpa, dept_id, profile_status
FROM STUDENT
WHERE cgpa >= 6.0 
  AND dept_id IN (1, 2)  -- CSE=1, ECE=2
  AND profile_status = 'active';

-- Index Used: Composite index (dept_id, profile_status, cgpa)
-- Query Time: ~8ms
```

**How Composite Index Works:**
```
CREATE INDEX idx_student_dept_status 
ON STUDENT(dept_id, profile_status);

Index structure (B-Tree):
┌─────────────────────────────────────────┐
│ (dept_id=1, status='active')            │
│ ├─ rows: 5, 12, 34, 78, 90              │
│ (dept_id=1, status='placed')            │
│ ├─ rows: 2, 18, 45                      │
│ (dept_id=2, status='active')            │
│ ├─ rows: 8, 23, 67, 91                  │
│ (dept_id=2, status='placed')            │
│ ├─ rows: 15, 42                         │
└─────────────────────────────────────────┘

Query steps:
1. Look up (dept_id IN [1,2] AND status='active')
2. Find all matching entries: [5, 12, 34, 78, 90, 8, 23, 67, 91]
3. Fetch these rows
4. Filter by cgpa >= 6.0 (in-memory)
5. Return result
```

### Example 2: Complex Job Search Filter

```sql
-- Student searches: Package > 10 LPA, Role contains "Engineer", Open jobs
SELECT jp.job_id, jp.role, jp.package, c.comp_name
FROM JOB_PROFILE jp
JOIN COMPANY c ON jp.comp_id = c.comp_id
WHERE jp.package > 10.0
  AND jp.role LIKE '%Engineer%'
  AND jp.status = 'open'
  AND jp.eligibility_cgpa <= 7.5;  -- Student's CGPA

-- Indexes Used: 
--   idx_job_status (job_id)
--   idx_job_package (job_id)
-- Query Time: ~15ms
```

---

## 3. FILTERING WITH JOINS (Related Tables)

### Example 1: Find Jobs Matching Student Skills

```sql
-- Find jobs that match student's skills
SELECT DISTINCT jp.job_id, jp.role, c.comp_name
FROM JOB_PROFILE jp
JOIN JOB_REQUIRED_SKILL jrs ON jp.job_id = jrs.job_id
JOIN STUDENT_SKILL ss ON jrs.skill_name = ss.skill_name
WHERE ss.s_id = 5
  AND jp.status = 'open';

/* Execution:
   1. Find skills for student 5: [Python, SQL, Docker]
   2. Find jobs requiring these skills
   3. Filter open jobs only
   4. Return distinct jobs
*/

-- Indexes Used:
--   idx_skill (skill_name)
--   idx_job_status (job_id)
-- Query Time: ~20ms
```

### Example 2: Show Student's Application Status with Company Details

```sql
-- Get all applications for a student with company details
SELECT 
    a.app_id,
    c.comp_name,
    jp.role,
    a.status,
    a.applied_date
FROM APPLICATION a
JOIN JOB_PROFILE jp ON a.job_id = jp.job_id
JOIN COMPANY c ON jp.comp_id = c.comp_id
WHERE a.s_id = 5
  AND a.status IN ('shortlisted', 'selected')
ORDER BY a.applied_date DESC;

-- Indexes Used:
--   idx_app_student (s_id)
--   idx_app_status (app_id)
--   idx_job_comp (comp_id)
-- Query Time: ~12ms
```

---

## 4. FILTERING WITH AGGREGATION (GROUP BY + HAVING)

### Example 1: Find Companies That Placed 5+ Students

```sql
SELECT 
    c.comp_id,
    c.comp_name,
    COUNT(DISTINCT pr.s_id) as students_placed
FROM COMPANY c
LEFT JOIN PLACEMENT_RECORD pr ON c.comp_id = pr.comp_id
GROUP BY c.comp_id, c.comp_name
HAVING COUNT(DISTINCT pr.s_id) >= 5
ORDER BY students_placed DESC;

/* 
WHERE clause: Filters BEFORE grouping
HAVING clause: Filters AFTER grouping
*/

-- Query Time: ~30ms (complex aggregation)
```

**Result:**
```
comp_id | comp_name  | students_placed
─────────────────────────────────────────
1       | Microsoft  | 20
2       | Google     | 18
3       | Amazon     | 15
4       | Infosys    | 12
5       | TCS        | 8
```

### Example 2: Find Departments with 80%+ Placement Rate

```sql
SELECT 
    d.dept_id,
    d.dept_name,
    COUNT(DISTINCT s.s_id) as total_students,
    COUNT(DISTINCT pr.s_id) as placed_students,
    ROUND(COUNT(DISTINCT pr.s_id) / COUNT(DISTINCT s.s_id) * 100, 2) as placement_rate
FROM DEPARTMENT d
LEFT JOIN STUDENT s ON d.dept_id = s.dept_id
LEFT JOIN PLACEMENT_RECORD pr ON s.s_id = pr.s_id
GROUP BY d.dept_id, d.dept_name
HAVING placement_rate >= 80
ORDER BY placement_rate DESC;

/* 
WHERE: Filters rows before grouping
HAVING: Filters groups after aggregation
*/

-- Query Time: ~50ms (full table scan + aggregation)
```

---

## 5. FILTERING WITH SUBQUERIES

### Example 1: Find Students Better Than Their Department Average

```sql
-- Find students with CGPA above department average
SELECT s.s_id, s.s_name, s.cgpa, d.dept_name
FROM STUDENT s
JOIN DEPARTMENT d ON s.dept_id = d.dept_id
WHERE s.cgpa > (
    SELECT AVG(cgpa)
    FROM STUDENT
    WHERE dept_id = s.dept_id
);

/* 
Correlated Subquery:
For each student, calculate their dept's average CGPA
Then filter: WHERE student's CGPA > dept average
*/

-- Query Time: ~100ms (correlated subquery)
```

### Example 2: Find Jobs With Above-Average Package

```sql
SELECT jp.job_id, jp.role, c.comp_name, jp.package
FROM JOB_PROFILE jp
JOIN COMPANY c ON jp.comp_id = c.comp_id
WHERE jp.package > (
    SELECT AVG(package)
    FROM JOB_PROFILE
);

-- Query Time: ~8ms (simple subquery)
```

---

## 6. FILTERING WITH TEXT SEARCH (LIKE)

### Example 1: Search Jobs by Role Name

```sql
-- Search: find all SDE/Backend related roles
SELECT job_id, role, package
FROM JOB_PROFILE
WHERE role LIKE '%Engineer%'
   OR role LIKE '%Developer%'
   OR role LIKE '%Architect%';

-- No index used (LIKE is slow)
-- Query Time: ~200ms (full table scan)
```

**Why LIKE is Slow:**
```
Index can't be used for: LIKE '%text%'
Because:
- LIKE '%text%' = search anywhere in string
- Index is sorted alphabetically at start
- Query must check every row
- Avoid unless necessary

Faster alternatives:
- Use '=' if possible: WHERE role = 'SDE'
- Use '>' or '<': WHERE role > 'S'
- Use IN: WHERE role IN ('SDE', 'Backend')
- Use FULLTEXT index: MATCH(role) AGAINST('engineer')
```

---

## 7. FILTERING WITH IN / NOT IN

### Example 1: Get Applications for Specific Companies

```sql
-- Get applications for Microsoft, Google, Amazon
SELECT a.app_id, a.s_id, jp.role, a.status
FROM APPLICATION a
JOIN JOB_PROFILE jp ON a.job_id = jp.job_id
WHERE jp.comp_id IN (1, 2, 3);  -- Microsoft=1, Google=2, Amazon=3

-- Query Time: ~10ms (indexed)
```

**vs. Bad Alternative:**
```sql
-- Bad (multiple OR conditions)
WHERE jp.comp_id = 1
   OR jp.comp_id = 2
   OR jp.comp_id = 3;

-- Better (use IN)
WHERE jp.comp_id IN (1, 2, 3);
```

### Example 2: Get Students NOT Placed

```sql
SELECT s.s_id, s.s_name
FROM STUDENT s
WHERE s.s_id NOT IN (
    SELECT DISTINCT s_id
    FROM PLACEMENT_RECORD
);

-- Query Time: ~40ms
```

---

## 8. FILTERING WITH BETWEEN

### Example 1: Find Jobs in Salary Range

```sql
-- Find jobs between 12 LPA and 18 LPA
SELECT job_id, role, package
FROM JOB_PROFILE
WHERE package BETWEEN 12.0 AND 18.0;

-- Equivalent to: WHERE package >= 12.0 AND package <= 18.0
-- Index Used: idx_job_package
-- Query Time: ~5ms
```

### Example 2: Find Applications Applied in Date Range

```sql
-- Get applications from last 30 days
SELECT app_id, s_id, job_id, applied_date
FROM APPLICATION
WHERE applied_date BETWEEN DATE_SUB(NOW(), INTERVAL 30 DAY) AND NOW();

-- Index Used: idx_deadline (applied_date)
-- Query Time: ~8ms
```

---

## 9. FRONTEND FILTERING (JavaScript + Backend)

### Multi-Filter Job Search Example

```javascript
// Frontend - User selects filters
const filters = {
    company: 'Microsoft',        // Company name
    role: 'SDE',                 // Role contains
    minPackage: 15,              // Minimum package
    maxPackage: 25,              // Maximum package
    skills: ['Python', 'Java'],  // Must have skills
    cgpaRequired: 7.0            // CGPA requirement
};

// Send to backend
async function searchJobs(filters) {
    const response = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
    });
    return response.json();
}
```

### Backend Processing

```sql
-- Backend builds dynamic query based on filters
SELECT DISTINCT 
    jp.job_id,
    jp.role,
    c.comp_name,
    jp.package,
    GROUP_CONCAT(DISTINCT jrs.skill_name SEPARATOR ', ') as required_skills
FROM JOB_PROFILE jp
JOIN COMPANY c ON jp.comp_id = c.comp_id
LEFT JOIN JOB_REQUIRED_SKILL jrs ON jp.job_id = jrs.job_id
WHERE 1=1
    -- Dynamically add conditions based on filters
    AND c.comp_name = ?              -- :company
    AND jp.role LIKE ?               -- :role%
    AND jp.package BETWEEN ? AND ?   -- :minPackage, :maxPackage
    AND jp.eligibility_cgpa <= ?     -- :cgpaRequired
    -- Skills filter (subquery)
    AND jp.job_id IN (
        SELECT job_id FROM JOB_REQUIRED_SKILL 
        WHERE skill_name IN ('Python', 'Java')
        GROUP BY job_id 
        HAVING COUNT(DISTINCT skill_name) = 2  -- Must have ALL skills
    )
GROUP BY jp.job_id, jp.role, c.comp_name, jp.package
ORDER BY jp.package DESC;

-- Query Time: ~30ms
```

---

## 10. INDEX STRATEGY FOR FILTERING

### Types of Indexes

```
1. SINGLE COLUMN INDEX (Simple)
   CREATE INDEX idx_cgpa ON STUDENT(cgpa);
   Best for: WHERE cgpa > 7.0
   
2. COMPOSITE INDEX (Multiple columns)
   CREATE INDEX idx_student_dept_status 
   ON STUDENT(dept_id, profile_status);
   Best for: WHERE dept_id = 1 AND profile_status = 'active'
   
3. FULLTEXT INDEX (Text search)
   CREATE FULLTEXT INDEX idx_role_fulltext ON JOB_PROFILE(role);
   Best for: WHERE MATCH(role) AGAINST('engineer' IN BOOLEAN MODE)
   
4. UNIQUE INDEX (Prevents duplicates)
   CREATE UNIQUE INDEX unique_app ON APPLICATION(s_id, job_id);
   Best for: Prevent duplicate applications
```

### Index Strategy for Your System

```sql
-- For Student Filtering
CREATE INDEX idx_student_cgpa ON STUDENT(cgpa);
CREATE INDEX idx_student_dept_status ON STUDENT(dept_id, profile_status);
CREATE INDEX idx_student_dept ON STUDENT(dept_id);
CREATE INDEX idx_student_status ON STUDENT(profile_status);

-- For Application Filtering
CREATE INDEX idx_app_student ON APPLICATION(s_id);
CREATE INDEX idx_app_job ON APPLICATION(job_id);
CREATE INDEX idx_app_status ON APPLICATION(status);
CREATE INDEX idx_app_date ON APPLICATION(applied_date);

-- For Job Filtering
CREATE INDEX idx_job_company ON JOB_PROFILE(comp_id);
CREATE INDEX idx_job_status ON JOB_PROFILE(status);
CREATE INDEX idx_job_package ON JOB_PROFILE(package);
CREATE INDEX idx_job_deadline ON JOB_PROFILE(app_deadline);

-- For Company Filtering
CREATE INDEX idx_company_tier ON COMPANY(tier);

-- For Resume Filtering
CREATE INDEX idx_resume_student ON RESUME(s_id);
CREATE INDEX idx_resume_ats_score ON RESUME(ats_score);
CREATE INDEX idx_resume_active ON RESUME(is_active);
```

---

## 11. FILTERING PERFORMANCE COMPARISON

```
Query Performance (with 10,000 records):
═════════════════════════════════════════════════════════

❌ Full Table Scan (No Index):
   SELECT * FROM STUDENT WHERE cgpa >= 7.0;
   Time: 500ms (reads ALL 10,000 rows)

✅ With Index:
   SELECT * FROM STUDENT WHERE cgpa >= 7.0;
   Time: 5ms (uses index, reads ~1,000 rows)
   
Improvement: 100x faster!


Complex Filtering Performance:
─────────────────────────────

✅ BEST: Multiple simple indexed filters
   WHERE status = 'open' AND package > 10;
   Time: 8ms

⚠️ MEDIUM: JOIN with filters
   SELECT * FROM app JOIN job ON ... WHERE status = 'open';
   Time: 25ms

❌ SLOW: Correlated subquery + filter
   WHERE cgpa > (SELECT AVG(cgpa) FROM student WHERE dept_id = s.dept_id);
   Time: 200ms

❌ SLOWEST: Full text search + aggregation
   WHERE MATCH(role) AGAINST('engineer') GROUP BY ... HAVING count > 5;
   Time: 500ms
```

---

## 12. REAL-WORLD FILTERING EXAMPLE FROM YOUR SYSTEM

### Use Case: "Show me all open jobs I'm eligible for"

```javascript
// Frontend
const studentCGPA = 7.5;
const studentDept = 'CSE';

const response = await fetch('/api/jobs/eligible', {
    method: 'POST',
    body: JSON.stringify({
        cgpa: studentCGPA,
        dept: studentDept
    })
});
```

```sql
-- Backend SQL
SELECT 
    jp.job_id,
    jp.role,
    c.comp_name,
    jp.package,
    jp.eligibility_cgpa,
    COUNT(DISTINCT jrs.skill_name) as skills_required
FROM JOB_PROFILE jp
JOIN COMPANY c ON jp.comp_id = c.comp_id
LEFT JOIN JOB_REQUIRED_SKILL jrs ON jp.job_id = jrs.job_id
LEFT JOIN JOB_ELIGIBILITY_BRANCH jeb ON jp.job_id = jeb.job_id
WHERE 1=1
    -- Filtering conditions
    AND jp.status = 'open'                          -- Only open jobs
    AND jp.eligibility_cgpa <= ?                    -- Student eligible (7.5)
    AND (jeb.branch_name = ? OR jeb.branch_name IS NULL)  -- CSE or no restriction
    -- NOT already applied
    AND jp.job_id NOT IN (
        SELECT job_id FROM APPLICATION 
        WHERE s_id = ? AND status != 'rejected'
    )
GROUP BY jp.job_id, jp.role, c.comp_name, jp.package, jp.eligibility_cgpa
HAVING COUNT(DISTINCT jrs.skill_name) > 0
ORDER BY jp.package DESC;

-- Indexes Used:
--   idx_job_status
--   idx_job_package
--   idx_job_eligibility_branch
-- Query Time: ~20ms
```

### Display to User

```
ELIGIBLE JOBS FOR YOU (7.5 CGPA, CSE)
═════════════════════════════════════════════════════════

✓ SDE (Microsoft) - 18.5 LPA
  Required: Python, Java, System Design
  [APPLY NOW]

✓ Backend Engineer (Google) - 17.75 LPA
  Required: Python, SQL, Cloud
  [APPLY NOW]

✓ QA Engineer (Amazon) - 12 LPA
  Required: Java, Testing Tools
  [APPLY NOW]

═════════════════════════════════════════════════════════
Showing 47 jobs matching your profile
```

---

## 13. FILTERING BEST PRACTICES

```
DO:
✅ Create indexes on frequently filtered columns (status, cgpa, date)
✅ Use WHERE for filtering before JOIN
✅ Use composite indexes for multi-column filters
✅ Use IN instead of multiple OR conditions
✅ Use BETWEEN for range filters
✅ Use = instead of LIKE when possible
✅ Index foreign key columns (for JOINs)

DON'T:
❌ Use LIKE '%text%' on large text columns
❌ Filter on computed columns (causes full scan)
❌ Use too many JOINs (>5 tables in one query)
❌ Filter on NULL without IS NULL index
❌ Create indexes on low-cardinality columns
❌ Over-index (too many indexes slow down WRITE operations)
```

---

## Summary Table: All Filtering Methods

| Method | Use Case | Speed | Index |
|--------|----------|-------|-------|
| **WHERE = value** | Exact match | ⚡⚡⚡ | Yes |
| **WHERE > or <** | Range | ⚡⚡⚡ | Yes |
| **WHERE BETWEEN** | Date/salary range | ⚡⚡⚡ | Yes |
| **WHERE IN (...)** | Multiple values | ⚡⚡⚡ | Yes |
| **WHERE LIKE 'text%'** | Prefix search | ⚡⚡ | Yes |
| **WHERE LIKE '%text%'** | Full text | ⚡ | No |
| **JOIN + WHERE** | Related tables | ⚡⚡ | Yes* |
| **GROUP BY + HAVING** | Aggregation | ⚡ | No** |
| **Subquery + WHERE** | Complex logic | ⚡ | Depends |
| **FULLTEXT MATCH** | Text search | ⚡⚡ | Yes |

---

## Conclusion

**Filtering in your system works through:**
1. **Database Indexes** - Direct lookup (fast)
2. **Query Optimization** - Proper WHERE/HAVING conditions
3. **JOINs** - Connect related tables efficiently
4. **Subqueries** - Complex nested conditions
5. **Frontend** - User selects criteria → Backend builds query
6. **Composite Indexes** - Multiple columns together

Result: **Sub-50ms queries** for most filtering operations on 10,000+ records!

