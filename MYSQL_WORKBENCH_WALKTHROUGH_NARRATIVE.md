# 🗄️ MySQL WORKBENCH WALKTHROUGH - NARRATIVE FORMAT

---

## OPENING

"Hi everyone. I'm going to walk you through the SQL commands we used to build our Student Placement Cell Database Management System. I'll show you all the different types of commands we created, and then deep-dive into explaining one example from each category so you understand how it all works together."

---

# SECTION 1: DDL COMMANDS - THESE ARE THE DDL COMMANDS I HAVE USED

"First, let me show you all the DDL commands - Data Definition Language - which we used to create the structure of our database. These are CREATE TABLE statements where we define all our entities."

## DDL Commands Used:

We created 7 main tables using CREATE TABLE statements:

- STUDENT table (with auto-increment ID, unique email, CGPA, relationships to coordinator and department)
- COMPANY table (company details, tier, location, CTC)
- JOB_PROFILE table (job roles, salary ranges, vacancies for each company)
- APPLICATION table (student applications, status tracking)
- OFFER table (offers with CTC and acceptance status)
- PLACEMENT_RECORD table (final placement records linking student, company, job, salary)
- PLACEMENT_COORDINATOR table (coordinator details and department)

We also used ALTER TABLE to add new columns later as needed.

---

### Deep Dive: DDL Example Explained

"Let me explain one of these DDL commands in detail - the STUDENT table creation:

What's happening? First, we're creating a new table called STUDENT. Then:

- s_id is the unique identifier. Every student gets a unique ID that automatically increases from 1, 2, 3... It's the PRIMARY KEY, meaning no two students can have the same ID.
- s_name is text, maximum 100 characters. NOT NULL means you MUST provide a name when creating a student.
- email must be unique (no two students can have same email) and required.
- cgpa is a decimal with 4 total digits, 2 after the decimal point (like 8.50).
- coord_id is a number that links to the coordinator.
- FOREIGN KEY creates the relationship - the coord_id in STUDENT table must match a coord_id in PLACEMENT_COORDINATOR table. This is how we connect students to their coordinators.

So this single DDL command creates an entire table with structure, constraints, and relationships. That's the power of DDL."

---

# SECTION 2: DML COMMANDS - THESE ARE THE DML COMMANDS I HAVE USED

"Now, once we have the structure, we need to put data INTO these tables. That's where DML comes in - Data Manipulation Language. These are INSERT, UPDATE, and DELETE commands."

## DML Commands Used:

We used DML for three operations:

**INSERT Commands:** Added individual students, multiple students at once, companies, job profiles, and applications

**UPDATE Commands:** Modified student status to 'placed', updated application status from 'applied' to 'shortlisted', decreased job vacancy counts after placements

**DELETE Commands:** Removed students who opted out and deleted old rejected applications

---

### Deep Dive: DML Example Explained

"Let me deep-dive into one DML operation - the UPDATE command:

When we update application status, we're saying 'UPDATE the APPLICATION table, SET the status column to 'shortlisted' WHERE app_id equals 1.'

Breaking it down:

- UPDATE APPLICATION - We're modifying records in the APPLICATION table.
- SET status = 'shortlisted' - We're changing the status column to have the value 'shortlisted'.
- WHERE app_id = 1 - But only do this for the record where app_id is 1.

This is CRITICAL - the WHERE clause. If I didn't write WHERE, every single application in the database would become 'shortlisted'. That would be a disaster! With WHERE, I'm being specific - only application ID 1 gets updated.

Now imagine a more complex update: Setting profile_status to 'placed' for all students where CGPA is 8.0 or higher AND they graduated in 2024. Multiple students will be updated based on these conditions. That's the power and danger of DML - it can affect many records at once, so you must be careful with WHERE clauses."

---

# SECTION 3: DQL COMMANDS - THESE ARE THE DQL COMMANDS

"Now we have data in the database. How do we GET that data out? That's DQL - Data Query Language. It's all about SELECT statements."

## DQL Commands Used:

We used SELECT queries for retrieving data:

- Simple SELECT to get all students
- SELECT specific columns (student name, email, CGPA)
- SELECT with WHERE to filter students by CGPA, status, year
- SELECT with ORDER BY to sort results by CGPA descending
- SELECT with LIMIT to get top 10 placed students
- SELECT with DISTINCT to get unique department IDs
- SELECT with COUNT to get total number of students
- SELECT with multiple WHERE conditions to find specific student groups
- SELECT companies filtered by tier

---

### Deep Dive: DQL Example Explained

"Let me explain one DQL query in detail:

When we query for top performers, we're reading it step by step:

- SELECT s_name, cgpa - 'Give me the student name and CGPA columns'
- FROM STUDENT - 'From the STUDENT table'
- WHERE cgpa > 8.0 - 'But only rows where CGPA is greater than 8.0'
- ORDER BY cgpa DESC - 'Sort them by CGPA in descending order (highest first)'
- LIMIT 10 - 'Give me only the first 10 rows'

So this query does: Find all students with CGPA above 8.0, sort them from highest to lowest CGPA, and show me the top 10. That's exactly what you'd do to find your top performers.

Without WHERE, you'd get all 1000 students. Without ORDER BY, they'd be in random order. Without LIMIT, you'd get all of them instead of top 10. Each part does something specific. That's DQL."

---

# SECTION 4: NOW THESE ARE SCRIPTS THAT WE CREATE FOR JOINS

"Now, here's where it gets powerful. We have data in different tables - STUDENT, COMPANY, APPLICATION, etc. How do we connect them? With JOINS."

## JOIN Scripts Created:

We created multiple JOIN queries:

- INNER JOINs to connect students with their coordinators
- INNER JOINs to link students with their applications and job profiles
- LEFT JOINs to get all students with application count (including students with zero applications)
- Multiple JOINs (3-4 tables) to get full placement details with student names, companies, job roles, and salaries
- Complex JOINs combining student info, coordinator names, placement records, and company details
- Company hiring statistics showing number of students hired per company

---

### Deep Dive: JOIN Example Explained

"Let me explain how JOINs work:

Think about it this way: In PLACEMENT_RECORD, we have s_id (student), comp_id (company), and job_id (job profile). But we want the actual NAMES and DETAILS, not just IDs.

So we:

- Start with PLACEMENT_RECORD - the placement records
- JOIN STUDENT where the student ID matches - Now we have student name
- JOIN COMPANY where company ID matches - Now we have company name
- JOIN JOB_PROFILE where job ID matches - Now we have job role

The result: For each placement, you see the student name, company name, job role, and salary - all connected! That's what JOINs do - they combine data from multiple tables using matching conditions. Without JOINs, you'd only have IDs, which mean nothing to humans."

---

# SECTION 5: AND THESE ARE SUBQUERIES

"Sometimes you need to ask a question within a question. That's a subquery - a query inside another query."

## Subquery Scripts Created:

We created different types of subqueries:

- Scalar Subqueries to find students above average CGPA
- IN Subqueries to find students who got selected in applications
- IN Subqueries to find companies that hired someone
- Correlated Subqueries to find top student per department
- EXISTS Subqueries to find companies with active job postings
- Multiple nested subqueries combining conditions (above-average CGPA AND got placed)

---

### Deep Dive: Subquery Example Explained

"Let me break down one subquery:

When we find students above average CGPA, the inner query calculates the average CGPA of ALL students (let's say it's 7.8). Then the outer query uses that average to filter and gets all students whose CGPA is greater than 7.8.

So the subquery FIRST calculates the average, then the outer query USES that average to filter.

Why is this powerful? Imagine you didn't know the average. You couldn't write the WHERE clause. But with a subquery, SQL calculates it for you automatically.

Here's a more complex one - finding the top student per department:

For EACH student, this finds 'what's the maximum CGPA in MY department?' and checks if I have that CGPA. So it finds the top student in each department. The inner query references the outer query - that's called a correlated subquery. It runs the inner query once FOR EACH row in the outer query. Powerful stuff!"

---

# SECTION 6: STORED PROCEDURES - THE AUTOMATION

"Finally, we create stored procedures - pre-written SQL code that we can call by name. These automate complex operations."

## Stored Procedures Created:

We created 3 main stored procedures:

1. **sp_accept_offer** - Procedure to accept an offer and handle all related updates atomically
   - Marks offer as accepted
   - Updates student status to placed
   - Reduces job vacancy count
   - Creates placement record
   - Uses transactions to ensure all-or-nothing execution

2. **sp_placement_stats** - Procedure to get placement statistics for a specific academic year
   - Shows total students per department
   - Shows number of students placed
   - Calculates placement percentage
   - Shows average salary offered

3. **sp_top_companies** - Procedure to get top hiring companies
   - Shows company names
   - Shows hiring count per company
   - Shows average salary per company

---

### Deep Dive: Stored Procedure Explained

"Let me explain what a stored procedure does using our offer acceptance procedure:

What's happening? When a student accepts an offer, multiple things need to happen:

1. Mark the offer as 'accepted'
2. Mark the student as 'placed'
3. Reduce the job vacancy count
4. Create a placement record

If you do these manually one by one, something could fail halfway through - maybe step 3 fails while steps 1 and 2 succeeded. Now you have inconsistent data!

With a procedure wrapped in START TRANSACTION and COMMIT, either ALL steps succeed together, or NONE of them do. If anything fails, the entire procedure rolls back. That's atomicity - all or nothing.

Also, instead of writing 4 UPDATE statements every time, you just call the procedure by name. One simple command. That's reusability and consistency. Every time, the same logic runs perfectly."

---

## CLOSING

"So that's our database system. We used:

- **DDL** to create the structure (tables, relationships)
- **DML** to put data in and modify it
- **DQL** to query and retrieve data
- **JOINs** to combine data from multiple tables
- **Subqueries** for complex nested logic
- **Stored Procedures** to automate and ensure consistency

All of these work together to create a powerful, reliable database that manages our placement system. Any questions?"
