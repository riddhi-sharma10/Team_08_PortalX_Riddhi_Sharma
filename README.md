# 🚀 PortalX: Student Placement Cell Database Management System

**Say goodbye to chaotic manual spreadsheets, scattered emails, and disjointed communication!** 

PortalX is a next-generation, comprehensive Placement Cell Management System that transforms traditional, manual placement tracking into a sleek, automated, and centralized digital experience. This platform bridges the gap between students, departmental coordinators, and central administration (CGDC) by providing a robust 3-tier dashboard ecosystem. 

From student registration to interview scheduling and real-time placement analytics, PortalX handles it all with seamless efficiency.

---

## ✨ Key Features

* **Dynamic ATS Score Calculator**: An automated Applicant Tracking System that instantly evaluates student resumes against job profile skills, generating an unbiased ATS match score entirely using advanced SQL Stored Procedures and Triggers.
* **Real-time Notifications**: Instant alerts (powered by Server-Sent Events) for students when their application status is updated (e.g., Shortlisted, Selected) or a new job is posted.
* **Role-Based Access Control (RBAC)**: Distinct dashboards and permissions for Students, Department Coordinators, and Central Admins.
* **Automated Placement Tracking**: Real-time synchronization of placement records, automatically updating global statistics the moment a student secures a job offer.
* **Interactive Dashboards & Analytics**: Data-rich analytics, including placement rates, department-wise trends, and system overviews powered by complex SQL Views.
* **Digital Query Resolution**: A built-in ticketing system for students to raise and resolve queries directly with their respective coordinators.

---

## 🛠️ Tech Stack

This project follows a classic **3-Tier Architecture** (Client, Server, Database) to ensure modularity, scalability, and clean separation of concerns.

* **Frontend (Client Tier)**: HTML5, CSS3 (Vanilla, custom dashboard-shell UI), Vanilla JavaScript, and Vite.
* **Backend (Server Tier)**: Node.js and Express.js for REST API routing, business logic, and Server-Sent Events (SSE) for real-time notifications.
* **Database (Data Tier)**: MySQL 8.x as the core relational database engine.

---

## 🔐 3-Level Access Architecture

The system enforces strict Role-Based Access Control (RBAC), dividing functionalities into a 3-level hierarchy to ensure data security and operational efficiency.

### 1. Level 1: Users (Students)
The foundational tier designed for the primary end-users of the placement cell.
* **Profile Management**: Maintain academic records, CGPA, graduation year, and personal details.
* **Job Board & ATS**: Browse eligible job postings based on department. Submit applications and receive an automated **ATS Resume Score** based on skill matching.
* **Application Tracking**: Track application status (Under Review, Shortlisted, Selected, Rejected).
* **Interview Schedules**: View upcoming technical and HR interview rounds.
* **Real-time Notifications**: Receive instant alerts for application status updates and new job postings.

### 2. Level 2: Coordinators (Departmental/Placement)
The intermediate tier responsible for the operational management of the placement drive.
* **Job & Company Management**: Create, edit, and manage job profiles and company details.
* **Application Processing**: Review student applications, evaluate ATS scores, and update statuses (e.g., shortlisting candidates).
* **Interview Coordination**: Schedule interview rounds for shortlisted students and notify them automatically.
* **Placement Analytics**: Monitor department-wise placement rates, job types, and placement trends via interactive charts.
* **Query Resolution**: Handle and resolve complaints or queries raised by students.

### 3. Level 3: CGDC Admin (Central Authority)
The highest administrative tier with overarching control and visibility over the entire university's placement process.
* **System Overview**: High-level, real-time dashboard displaying total students registered, active companies, and total placements secured.
* **User & Role Management**: Oversee coordinator accounts and maintain overall student database integrity.
* **Master Data Control**: Manage foundational data like Departments, Courses, and System settings.
* **Global Analytics & Logs**: Access comprehensive, university-wide placement reports, performance graphs, and system operation logs.

---

## 🗄️ Core DBMS Concepts Implemented

This project extensively utilizes advanced Database Management System (DBMS) concepts to ensure data integrity, performance, and reliability.

### 1. Relational Design & Normalization
* **Entity-Relationship Model**: Carefully designed ER schema with clear definitions of Strong/Weak entities and precise cardinalities (Total/Partial participation).
* **3NF / BCNF Normalization**: The database schema is strictly normalized up to the Third Normal Form (3NF) to eliminate insertion, update, and deletion anomalies while controlling data redundancy.

### 2. Advanced SQL Programmability
* **Stored Procedures**: Encapsulate complex, multi-step business logic directly within the database. Used for operations like calculating aggregate placement metrics, processing bulk updates, or executing ATS scoring logic securely and efficiently.
* **Functions**: Custom User-Defined Functions (UDFs) created to compute specific derived values on the fly, such as formatting specialized IDs, calculating GPA percentages, or evaluating eligibility criteria dynamically without repeated application logic.
* **Views**: Virtual tables (`STUDENT_PLACEMENT_VIEW`, `ANALYTICS_VIEW`) created to abstract and simplify complex multi-table joins, providing clean data pipelines for the analytical dashboards.
* **Triggers**: Database-level event listeners used to automate state transitions. Triggers automatically maintain audit logs, update total application counts when a new record is inserted, and ensure data consistency without relying entirely on backend application code.

### 3. Transaction Management (ACID)
* Ensures **Atomicity, Consistency, Isolation, and Durability** for all critical workflows.
* Multi-step operations, such as confirming a final job offer (which involves updating the application status, inserting a placement record, and updating the student's global status), are wrapped in `START TRANSACTION`, `COMMIT`, and `ROLLBACK` blocks. This guarantees that either all changes succeed or none do, preventing corrupt or partial data states.

### 4. Concurrency & Performance Optimization
* **Connection Pooling**: The Node.js backend utilizes MySQL connection pooling to efficiently manage and recycle multiple concurrent database requests, preventing connection exhaustion under heavy load.
* **Database Locks**: Implementation of row-level and table-level locking mechanisms where necessary to prevent race conditions (e.g., when two coordinators try to update the exact same application simultaneously).

---

## 🚀 Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Student_Placement_Cell_Database_Management_System
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   cd server && npm install
   ```

3. **Database Configuration:**
   * Ensure MySQL is running.
   * Create the database schema and populate dummy data using the provided SQL scripts.
   * Configure your `.env` file in the `/server` directory with your MySQL credentials (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).

4. **Run the Application:**
   * Start the backend server: `cd server && npm start`
   * Start the frontend dev server: `npm run dev`

---
*Developed as part of the Database Management Systems (DBMS) University Project.*
