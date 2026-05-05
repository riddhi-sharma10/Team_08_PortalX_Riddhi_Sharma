# 🗄️ MySQL WORKBENCH WALKTHROUGH - CONDENSED

## Quick SQL Tutorial - 1.5 Minutes Narrative

---

## OPENING (15 seconds)

"Hi everyone. I'll quickly walk through our Student Placement database and show the key SQL commands that power it. Let's jump in."

---

## SECTION 1: DDL - DATA DEFINITION LANGUAGE (10 seconds)

"DDL creates and modifies database structure. CREATE TABLE, ALTER, DROP are the main commands."

```sql
CREATE TABLE STUDENT (
    s_id INT AUTO_INCREMENT PRIMARY KEY,
    s_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    cgpa DECIMAL(4,2),
    coord_id INT,
    FOREIGN KEY (coord_id) REFERENCES PLACEMENT_COORDINATOR(coord_id)
);
```

---

## SECTION 2: DML - DATA MANIPULATION LANGUAGE (15 seconds)

"DML handles data - INSERT adds, UPDATE modifies, DELETE removes. Always use WHERE clause carefully."

```sql
INSERT INTO STUDENT (s_name, email, cgpa, coord_id)
VALUES ('Raj Kumar', 'raj@college.edu', 8.5, 10);

UPDATE STUDENT SET profile_status = 'placed' WHERE cgpa >= 8.0;

DELETE FROM STUDENT WHERE profile_status = 'opted_out';
```

---

## SECTION 3: DQL - DATA QUERY LANGUAGE (15 seconds)

"DQL retrieves data using SELECT. Filter with WHERE, sort with ORDER BY, limit with LIMIT."

```sql
SELECT s_name, cgpa FROM STUDENT
WHERE cgpa > 8.0
ORDER BY cgpa DESC
LIMIT 10;
```

---

## SECTION 4: JOINS - COMBINING MULTIPLE TABLES (20 seconds)

"JOINS connect data from multiple tables. INNER JOIN matches both sides, LEFT JOIN keeps all from left table."

```sql
-- INNER JOIN - students with coordinators
SELECT s.s_name, c.name
FROM STUDENT s
INNER JOIN PLACEMENT_COORDINATOR c ON s.coord_id = c.coord_id;

-- Multiple JOINs - full placement details
SELECT s.s_name, c.comp_name, j.role, pr.salary_offered
FROM PLACEMENT_RECORD pr
JOIN STUDENT s ON pr.s_id = s.s_id
JOIN COMPANY c ON pr.comp_id = c.comp_id
JOIN JOB_PROFILE j ON pr.job_id = j.job_id;
```

---

## SECTION 5: GROUP BY & AGGREGATION (15 seconds)

"GROUP BY groups rows, aggregate functions (COUNT, SUM, AVG) calculate. HAVING filters groups after aggregation."

```sql
SELECT dept_id, COUNT(*) AS StudentCount, AVG(cgpa) AS AvgCGPA
FROM STUDENT
GROUP BY dept_id
HAVING COUNT(*) >= 20
ORDER BY AvgCGPA DESC;
```

---

## SECTION 6: SUBQUERIES - NESTED QUERIES (15 seconds)

"Subqueries are queries inside queries. Use them for complex logic - scalar subquery returns one value, IN subquery returns multiple."

```sql
-- Scalar subquery - students above average
SELECT s_name, cgpa FROM STUDENT
WHERE cgpa > (SELECT AVG(cgpa) FROM STUDENT);

-- IN subquery - selected students
SELECT s_name FROM STUDENT
WHERE s_id IN (SELECT DISTINCT s_id FROM APPLICATION WHERE status = 'selected');
```

---

## SECTION 7: VIEWS - VIRTUAL TABLES (15 seconds)

"A view is a saved SELECT query. Instead of rewriting complex queries, create them once and query repeatedly."

```sql
CREATE VIEW vw_student_profiles AS
SELECT s.s_id, s.s_name, s.cgpa, COUNT(DISTINCT pr.record_id) AS PlacementCount
FROM STUDENT s
LEFT JOIN PLACEMENT_RECORD pr ON s.s_id = pr.s_id
GROUP BY s.s_id;

-- Now query it simply
SELECT * FROM vw_student_profiles WHERE cgpa >= 8.0;
```

---

## SECTION 8: FUNCTIONS - BUILT-IN CALCULATIONS (15 seconds)

"Functions do calculations - COUNT, SUM, AVG for aggregates; UPPER, LOWER for strings; YEAR, MONTH for dates."

```sql
SELECT s_name,
       UPPER(email) AS Email,
       CGPA,
       CASE WHEN cgpa >= 9.0 THEN 'Elite' WHEN cgpa >= 8.0 THEN 'Very Good' ELSE 'Good' END AS Level
FROM STUDENT;
```

---

## SECTION 9: STORED PROCEDURES - REUSABLE CODE (20 seconds)

"Stored procedures are pre-written SQL code executed by name. They ensure consistency and security."

```sql
CREATE PROCEDURE sp_accept_offer(IN p_offer_id INT)
BEGIN
    START TRANSACTION;
    UPDATE OFFER SET offer_status = 'accepted' WHERE offer_id = p_offer_id;
    UPDATE STUDENT SET profile_status = 'placed' WHERE s_id = (SELECT s_id FROM OFFER WHERE offer_id = p_offer_id);
    COMMIT;
END;

CALL sp_accept_offer(50);
```

---

---

## SECTION 10: INDEXES - QUERY OPTIMIZATION (10 seconds)

"Indexes speed up lookups - without index it scans all rows, with index it's instant via B-tree."

```sql
CREATE INDEX idx_email ON STUDENT(email);
CREATE INDEX idx_cgpa ON STUDENT(cgpa);

EXPLAIN SELECT * FROM STUDENT WHERE email = 'raj@college.edu';
```

---

## SECTION 11: TRIGGERS - AUTOMATIC ACTIONS (10 seconds)

"Triggers run automatically when events occur - useful for audit logging and enforcing business rules."

```sql
CREATE TRIGGER trg_application_audit
AFTER UPDATE ON APPLICATION
FOR EACH ROW
BEGIN
    IF NEW.status != OLD.status THEN
        INSERT INTO STATUS_AUDIT_LOG (app_id, old_status, new_status, changed_at)
        VALUES (NEW.app_id, OLD.status, NEW.status, NOW());
    END IF;
END;
```

---

## SECTION 12: TRANSACTIONS - ALL OR NOTHING (10 seconds)

"Transactions ensure multiple operations either all succeed or all fail - no partial updates."

```sql
START TRANSACTION;
UPDATE OFFER SET offer_status = 'accepted' WHERE offer_id = 50;
UPDATE STUDENT SET profile_status = 'placed' WHERE s_id = 105;
UPDATE JOB_PROFILE SET vacancies = vacancies - 1 WHERE job_id = 20;
INSERT INTO PLACEMENT_RECORD VALUES (...);
COMMIT;
```

---

## CLOSING (10 seconds)

"That's our database - DDL creates structure, DML manipulates data, DQL queries it, JOINs combine tables, aggregation summarizes, subqueries enable complex logic, views simplify queries, functions calculate, procedures automate, indexes optimize, triggers enforce rules, and transactions ensure consistency. All together - a robust system."

---

## QUICK REFERENCE

**Common Patterns:**

Basic SELECT with filter and sort:

```sql
SELECT column1, column2 FROM TABLE_NAME WHERE condition ORDER BY column1;
```

JOIN two tables:

```sql
SELECT t1.col1, t2.col2 FROM TABLE1 t1 JOIN TABLE2 t2 ON t1.key = t2.key;
```

GROUP and aggregate:

```sql
SELECT column, COUNT(*) FROM TABLE GROUP BY column HAVING COUNT(*) > 5;
```

Subquery in WHERE:

```sql
SELECT * FROM TABLE WHERE column IN (SELECT column FROM TABLE2);
```

Complex placement query:

```sql
SELECT s.s_name, c.comp_name, pr.salary_offered
FROM PLACEMENT_RECORD pr
JOIN STUDENT s ON pr.s_id = s.s_id
JOIN COMPANY c ON pr.comp_id = c.comp_id
WHERE pr.salary_offered > 10
ORDER BY pr.salary_offered DESC;
```
