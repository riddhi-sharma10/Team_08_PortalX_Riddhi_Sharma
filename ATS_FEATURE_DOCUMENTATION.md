# ATS Calculator — Complete Implementation Documentation

> **Project:** Student Placement Cell Database Management System  
> **Feature:** Resume ATS (Applicant Tracking System) Score Calculator  
> **Stack:** Node.js + Express (backend) · Vanilla JS + Vite (frontend) · MySQL (database)  
> **Date Implemented:** May 2026

---

## Table of Contents

1. [What is an ATS Calculator?](#1-what-is-an-ats-calculator)
2. [Architecture Overview](#2-architecture-overview)
3. [Why We Built It Ourselves](#3-why-we-built-it-ourselves)
4. [Database Changes](#4-database-changes)
5. [Dependencies Installed](#5-dependencies-installed)
6. [File-by-File Implementation](#6-file-by-file-implementation)
   - [6.1 Scoring Algorithm](#61-serverutilsatsscoringjs)
   - [6.2 Backend Route](#62-serverroutesresumesjs)
   - [6.3 Frontend API Helper](#63-jsapijs)
   - [6.4 Frontend ATS Page](#64-jsstudentatsjs)
7. [Data Flow — End to End](#7-data-flow--end-to-end)
8. [Scoring Algorithm Explained](#8-scoring-algorithm-explained)
9. [API Reference](#9-api-reference)
10. [Known Gotchas & Fixes](#10-known-gotchas--fixes)
11. [How to Test](#11-how-to-test)

---

## 1. What is an ATS Calculator?

An **ATS (Applicant Tracking System)** is software used by recruiters to automatically screen resumes before a human ever reads them. It works by scanning a resume for keywords that match a job description.

Our ATS Calculator:
- Accepts a student's PDF resume via file upload
- Extracts the raw text from the PDF on the **server**
- Compares the text against a predefined keyword list for the **selected job role**
- Returns a **score out of 100** indicating how well the resume matches
- Stores the score + keyword analysis permanently in the **MySQL database**
- Displays results live in the student dashboard with keyword chips and history

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│              FRONTEND  (js/student/ats.js)                   │
│                                                              │
│  Upload Card          Score Card          History Table      │
│  ─────────────        ──────────          ─────────────      │
│  • PDF drop zone      • Animated circle   • All past scans   │
│  • Job role select    • Keyword coverage  • Score trend ▲▼   │
│  • Version label      • Found/Missing     • Delete button     │
│         │             chips                                   │
│         │ FormData (multipart/form-data)                      │
└─────────┼────────────────────────────────────────────────────┘
          │ POST /api/resumes/analyze
          │ Authorization: Bearer <jwt_token>
┌─────────▼────────────────────────────────────────────────────┐
│              BACKEND  (server/routes/resumes.js)             │
│                                                              │
│  1. multer receives the PDF file                             │
│  2. Saves it temporarily to server/uploads/resumes/          │
│  3. pdf-parse reads the PDF buffer → extracts plain text     │
│  4. calculateATSScore(text, jobRole) scores the resume       │
│  5. INSERT row into RESUME table with score + keywords       │
│  6. Deletes the temp file from disk                          │
│  7. Returns JSON result to frontend                          │
└─────────┬────────────────────────────────────────────────────┘
          │ INSERT INTO RESUME (...)
┌─────────▼────────────────────────────────────────────────────┐
│              DATABASE  (MySQL — RESUME table)                │
│                                                              │
│  resume_id │ s_id │ file_url │ ats_score │ version_label    │
│  role_targeted │ keywords_found │ keywords_missing           │
│  is_active │ uploaded_on                                     │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Why We Built It Ourselves

We evaluated two options:

| Option | Verdict | Reason |
|--------|---------|--------|
| **Clone a GitHub ATS repo** | ❌ Rejected | All popular repos are Python (Flask/FastAPI). Running a separate Python server alongside our Node.js backend creates two servers to manage, CORS issues, different auth systems, and a totally separate database schema. |
| **Build it natively in Node.js** | ✅ Chosen | The core algorithm is ~50 lines of keyword matching. It integrates directly with our existing MySQL tables, JWT auth middleware, and Express routes. Total build time: ~2 hours. |

**The algorithm itself is simple:**
```
score = (required_keywords_matched / total_required_keywords) × 80
      + (nice_to_have_matched × 2, capped at 20)
```

No ML model. No external API. Just text matching — which is exactly what most real ATS systems use at the screening stage.

---

## 4. Database Changes

### Existing RESUME Table (before this feature)

```sql
CREATE TABLE RESUME (
    resume_id    INT PRIMARY KEY AUTO_INCREMENT,
    s_id         INT NOT NULL,          -- FK → STUDENT.s_id
    file_url     VARCHAR(255) NOT NULL, -- filename or URL
    uploaded_on  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ats_score    DECIMAL(5,2),
    version_label VARCHAR(50) DEFAULT 'v1',
    is_active    TINYINT(1) DEFAULT 1
);
```

The `ats_score` column already existed but was **never written to** — there was no upload/scoring endpoint.

### Columns Added by This Feature

```sql
ALTER TABLE RESUME ADD COLUMN role_targeted   VARCHAR(100) NULL AFTER version_label;
ALTER TABLE RESUME ADD COLUMN keywords_found  JSON         NULL AFTER role_targeted;
ALTER TABLE RESUME ADD COLUMN keywords_missing JSON        NULL AFTER keywords_found;
```

| Column | Type | Purpose |
|--------|------|---------|
| `role_targeted` | VARCHAR(100) | Which job role the student scanned against (e.g. "Software Engineer") |
| `keywords_found` | JSON | Array of keywords found in the resume (e.g. `["Python","SQL","Git"]`) |
| `keywords_missing` | JSON | Array of keywords absent from the resume — actionable feedback |

> **Why store keywords in DB?**  
> So history records show *which* keywords were missing at the time of each scan, not just the score. This lets students track improvement over multiple resume versions.

---

## 5. Dependencies Installed

Run inside the `server/` directory:

```bash
npm install pdf-parse multer
```

| Package | Version | Purpose |
|---------|---------|---------|
| `pdf-parse` | ^2.x | Extracts plain text from PDF buffers using pdfjs-dist under the hood |
| `multer` | ^1.x | Express middleware for handling `multipart/form-data` file uploads |

### Critical: ESM Import for pdf-parse v2

`pdf-parse` v2 is **not** a simple default export. It exports named classes:

```js
// ✅ Correct (v2 ESM)
import { PDFParse } from 'pdf-parse';

// ❌ Wrong — no default export in v2
import pdfParse from 'pdf-parse';

// ❌ Wrong — subpath not in exports map
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
```

And the constructor must receive `{ data: Uint8Array }` — not a raw `Buffer`:

```js
// ✅ Correct
const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
await parser.load();          // no argument — options were passed in constructor
const textResult = await parser.getText();
const text = textResult.text; // full concatenated string

// ❌ Wrong — causes "getDocument - no url parameter provided"
const parser = new PDFParse({});
await parser.load(pdfBuffer); // this does nothing with the buffer
```

**Root cause of the bug:** `PDFParse` internally calls `pdfjs.getDocument(this.options)`. pdfjs requires either `{ url }` or `{ data: Uint8Array }` in the options object. Passing an empty `{}` and then calling `.load(buffer)` meant pdfjs never received the PDF data.

---

## 6. File-by-File Implementation

### 6.1 `server/utils/atsScoring.js`

**NEW FILE** — the scoring algorithm. Pure function, no DB, no Express.

**Key structure:**
```js
const SKILL_DATABASE = {
  'Software Engineer': {
    required:     ['JavaScript', 'Python', 'Java', 'C++', 'Git', 'SQL', 'REST API', 'Data Structures'],
    nice_to_have: ['React', 'Node.js', 'Docker', 'Kubernetes', 'AWS', 'Agile', ...],
  },
  'Frontend Developer': { ... },
  'Backend Developer':  { ... },
  'Full Stack Developer': { ... },
  'Data Analyst':  { ... },
  'Data Scientist': { ... },
  'DevOps Engineer': { ... },
  'Product Manager': { ... },
};

export function calculateATSScore(resumeText, jobRole) {
  // 1. Uppercase everything for case-insensitive matching
  // 2. Check each required keyword → found or missing
  // 3. Check nice-to-have keywords → bonus points
  // 4. Calculate: (required matched / total required) × 80 + bonus (max 20)
  return { score, foundKeywords, missingKeywords, matchPercentage };
}

export const AVAILABLE_ROLES = Object.keys(SKILL_DATABASE); // for frontend dropdown
```

**Scoring formula:**
```
baseScore  = (requiredMatched / totalRequired) × 80
bonusScore = Math.min(20, niceToHaveMatched × 2)
finalScore = Math.min(100, Math.round(baseScore + bonusScore))
```

---

### 6.2 `server/routes/resumes.js`

**MODIFIED** — was a simple GET-only route. Now has 4 endpoints.

#### `GET /api/resumes`
Fetches all resume records for the logged-in student (ordered newest first). Now also returns `role_targeted`, `keywords_found`, `keywords_missing` — JSON columns are parsed before sending.

#### `GET /api/resumes/roles`
Returns `AVAILABLE_ROLES` array for the frontend dropdown. No auth needed.

#### `POST /api/resumes/analyze`  ← **Core new endpoint**

Full pipeline:
```
multer saves PDF to disk
    → fs.readFileSync(filePath) → Buffer
    → new PDFParse({ data: new Uint8Array(buffer) })
    → parser.load() → parser.getText() → raw text string
    → calculateATSScore(text, jobRole) → { score, foundKeywords, missingKeywords }
    → INSERT INTO RESUME (...) VALUES (...)
    → fs.unlinkSync(filePath)  -- delete temp file
    → res.json({ score, foundKeywords, missingKeywords, matchPercentage, ... })
```

The `columnExists()` helper checks if `role_targeted` column is present before including it in the INSERT — so the code is backwards-compatible if the ALTER TABLE hasn't been run.

#### `DELETE /api/resumes/:id`
Lets students delete a specific analysis record. Validates ownership (`s_id = req.user.entityId`).

---

### 6.3 `js/api.js`

**MODIFIED** — added `postForm()` method for multipart uploads.

```js
postForm: async (path, formData) => {
    const token = localStorage.getItem('placement_token');
    const response = await fetch(BASE_URL + path, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
        // ⚠️ NO Content-Type header set here
        // Browser sets it automatically with the correct multipart boundary
    });
    // ... error handling same as request()
}
```

> **Why a separate method?**  
> The main `request()` function always sets `Content-Type: application/json`. For file uploads, the browser must set `Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...` automatically — if you set it manually, the boundary is missing and the server can't parse the file.

---

### 6.4 `js/student/ats.js`

**FULLY REWRITTEN** — was a UI-only page with a fake `setTimeout` button.

#### Features Added

| Feature | How |
|---------|-----|
| **Stats row** | 3 stat cards: Total Scans, Best Score, Average Score — computed from history array |
| **Version label input** | Text input → sent as `versionLabel` in FormData → stored in `version_label` column |
| **Job role dropdown** | Populated from `GET /api/resumes/roles` (falls back to hardcoded list) |
| **Drag & drop** | `dragover`, `dragleave`, `drop` events on the drop zone |
| **Real API call** | `api.postForm('/resumes/analyze', formData)` replaces the fake `setTimeout` |
| **Live score circle** | SVG `stroke-dashoffset` animated on result: `263.8 × (1 - score/100)` |
| **Keyword coverage bar** | Progress bar: `(found / total) × 100%` width |
| **Trend indicator** | Compares `resumes[0].score` vs `resumes[1].score` → shows ▲+N or ▼-N |
| **2-column keyword panel** | Found chips (green) left, Missing chips (red) right |
| **History table** | 7 columns: filename, version, role, date, score+delta, status tag, delete button |
| **Delete button** | Calls `api.delete('/resumes/:id')` → refreshes table |

---

## 7. Data Flow — End to End

```
Student opens ATS tab
    └─> render() called
            └─> api.get('/resumes/roles')  → populates dropdown
            └─> api.get('/resumes')        → loads history + latest score

Student selects file + role + label → clicks "Start ATS Analysis"
    └─> FormData built: { resume: File, jobRole: string, versionLabel: string }
    └─> api.postForm('/resumes/analyze', formData)
            └─> [server] multer saves PDF to uploads/resumes/<hash>
            └─> [server] pdf-parse extracts text
            └─> [server] calculateATSScore(text, jobRole)
            └─> [server] INSERT INTO RESUME (s_id, file_url, ats_score, ...)
            └─> [server] fs.unlinkSync() — temp file deleted
            └─> [server] res.json({ score, foundKeywords, missingKeywords, ... })
    └─> updateScoreDisplay(result) — animates SVG circle
    └─> showKeywordsPanel(result) — renders keyword chips
    └─> api.get('/resumes') — refreshes history table
    └─> upload zone reset for next file
```

---

## 8. Scoring Algorithm Explained

### Example: Resume with these keywords

```
"JavaScript, React, Node.js, SQL, Git, Python, Docker"
Target role: Software Engineer
```

**Required keywords** (8 total):
```
JavaScript ✓ | Python ✓ | Java ✗ | C++ ✗ | Git ✓ | SQL ✓ | REST API ✗ | Data Structures ✗
Matched: 4/8
```

**Base score:** `(4/8) × 80 = 40`

**Nice-to-have keywords** (9 total):
```
React ✓ | Node.js ✓ | Docker ✓ | Kubernetes ✗ | AWS ✗ | Agile ✗ | Scrum ✗ | CI/CD ✗ | TypeScript ✗
Matched: 3 nice-to-have
```

**Bonus score:** `min(20, 3 × 2) = 6`

**Final score:** `min(100, 40 + 6) = 46`

### Score Thresholds

| Score | Label | Tag Color |
|-------|-------|-----------|
| 80–100 | Strong Match! | Green |
| 60–79 | Good Potential | Yellow/Amber |
| 0–59 | Needs Improvement | Red |

---

## 9. API Reference

### `POST /api/resumes/analyze`

**Auth:** Required (Bearer JWT, role = student)  
**Content-Type:** `multipart/form-data`

**Request body (FormData):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `resume` | File (PDF) | ✅ | PDF resume, max 5 MB |
| `jobRole` | string | ✅ | Must match a key in SKILL_DATABASE |
| `versionLabel` | string | ❌ | Custom label, e.g. "SWE_v3". Auto-generated if omitted |

**Response 200:**
```json
{
  "success": true,
  "id": 302,
  "score": 64,
  "foundKeywords": ["JavaScript", "Python", "React", "Git"],
  "missingKeywords": ["Java", "C++", "REST API", "Data Structures"],
  "matchPercentage": "4/8",
  "jobRole": "Software Engineer",
  "fileName": "Resume.pdf",
  "versionLabel": "v7842"
}
```

**Response 400:**
```json
{ "error": "Could not extract readable text from this PDF. Please try a text-based PDF (not a scanned image)." }
```

---

### `GET /api/resumes`

**Auth:** Required  
**Returns:** Array of resume records for the logged-in student, newest first.

```json
[
  {
    "id": 302,
    "filename": "Resume.pdf",
    "score": "59.00",
    "date": "2026-05-02T07:40:27.000Z",
    "version_label": "v1",
    "is_active": 1,
    "role_targeted": "Software Engineer",
    "keywords_found": ["JavaScript", "Python", "Git"],
    "keywords_missing": ["Java", "C++", "REST API", "SQL", "Data Structures"]
  }
]
```

---

### `GET /api/resumes/roles`

**Auth:** Not required  
**Returns:** `["Software Engineer", "Frontend Developer", ...]`

---

### `DELETE /api/resumes/:id`

**Auth:** Required  
**Returns:** `{ "success": true }` or 404 if not found/not owned

---

## 10. Known Gotchas & Fixes

### Gotcha 1: `getDocument - no url parameter provided`

**Error message:** `Analysis failed: getDocument - no url parameter provided.`

**Cause:** `pdf-parse` v2's `PDFParse` class passes its constructor options directly to pdfjs's `getDocument()`. pdfjs requires either `{ url }` or `{ data: Uint8Array }`. We were constructing with `new PDFParse({})` (empty options) and then calling `.load(buffer)` — but `.load()` ignores arguments; it uses the constructor options.

**Fix:**
```js
// ❌ Before
const parser = new PDFParse({});
await parser.load(pdfBuffer);

// ✅ After
const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
await parser.load(); // no argument needed
```

---

### Gotcha 2: File uploads fail silently if Content-Type is set

**Cause:** If you pass `Content-Type: multipart/form-data` manually in the fetch headers, the boundary string is missing. multer cannot parse the request and `req.file` is undefined.

**Fix:** Never set `Content-Type` for FormData requests. The browser adds it automatically with the correct boundary:
```
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryXYZ
```

---

### Gotcha 3: pdf-parse v2 has no default export

**Error:** `pdfParse is not a function` or similar.

**Fix:** Use named import:
```js
import { PDFParse } from 'pdf-parse'; // ✅
```

---

### Gotcha 4: PowerShell doesn't support `&&`

When running npm commands in the project:
```powershell
# ❌ Fails in PowerShell
cd server && npm install pdf-parse multer

# ✅ Works
cd server
npm install pdf-parse multer
```

---

## 11. How to Test

### 1. Start the server
```bash
cd server
node index.js
```
Look for: `✅ MySQL connected successfully with SSL!`

### 2. Log in as a student
Open the app and log in with a student account.

### 3. Navigate to ATS tab
Click **"ATS Optimizer"** in the sidebar.

### 4. Upload a real PDF resume
- Click the drop zone or drag a PDF file in
- Select a job role (e.g. "Software Engineer")
- Optionally enter a version label (e.g. "Draft_v2")
- Click **Start ATS Analysis**

### 5. Expected results
- Score circle animates to the calculated score
- Keywords Found (green) and Missing (red) chips appear below
- History table adds a new row at the top
- Trend indicator (▲/▼) appears if there's a previous scan

### 6. Verify in DB
```sql
SELECT resume_id, s_id, file_url, ats_score, role_targeted, 
       version_label, uploaded_on
FROM RESUME 
ORDER BY uploaded_on DESC 
LIMIT 5;
```

You should see your new row with the correct `ats_score` and `role_targeted`.

---

*This document covers the complete end-to-end implementation of the ATS Calculator feature as built in May 2026.*
