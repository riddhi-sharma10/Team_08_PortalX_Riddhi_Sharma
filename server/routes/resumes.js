
import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateATSScore, AVAILABLE_ROLES, ROLE_DESCRIPTIONS } from '../utils/atsScoring.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const uploadsDir = path.join(__dirname, '../uploads/resumes');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const router = express.Router();

// ─── multer config ─────────────────────────────────────────────────────────────
const upload = multer({
    dest: uploadsDir,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files are allowed.'));
    },
});

// ─── GET /api/resumes ──────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Access denied' });
    try {
        const studentId = req.user.entityId;
        if (!studentId) return res.status(400).json({ error: 'User profile not linked to a student record' });

        const [rows] = await pool.query(
            `SELECT resume_id as id, file_url as filename, ats_score as score,
                    uploaded_on as date, version_label, is_active,
                    role_targeted, keywords_found, keywords_missing
             FROM RESUME WHERE s_id = ? ORDER BY uploaded_on DESC`,
            [studentId]
        );
        // Parse JSON columns if they exist
        res.json(rows.map(r => ({
            ...r,
            keywords_found: tryParseJSON(r.keywords_found, []),
            keywords_missing: tryParseJSON(r.keywords_missing, []),
        })));
    } catch (err) {
        console.error('RESUME FETCH ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/resumes/roles ────────────────────────────────────────────────────
router.get('/roles', (_req, res) => res.json({ roles: AVAILABLE_ROLES, descriptions: ROLE_DESCRIPTIONS }));

// ─── GET /api/resumes/:id ──────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Access denied' });
    try {
        const [rows] = await pool.query(
            `SELECT * FROM RESUME WHERE resume_id = ? AND s_id = ?`,
            [req.params.id, req.user.entityId]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Record not found' });
        const r = rows[0];
        res.json({
            ...r,
            keywords_found: tryParseJSON(r.keywords_found, []),
            keywords_missing: tryParseJSON(r.keywords_missing, []),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/resumes/analyze ────────────────────────────────────────────────
router.post('/analyze', requireAuth, upload.single('resume'), async (req, res) => {
    if (req.user.role !== 'student') {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(403).json({ error: 'Only students can analyze resumes.' });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded. Please attach a PDF.' });

    const filePath = req.file.path;

    try {
        const { jobRole, versionLabel } = req.body;
        if (!jobRole) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ error: 'jobRole is required.' });
        }

        // 1. Extract text from PDF
        const pdfBuffer = fs.readFileSync(filePath);
        const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
        await parser.load();
        const textResult = await parser.getText();
        const resumeText = textResult.text || '';

        if (!resumeText || resumeText.trim().length < 50) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ error: 'Could not extract readable text from this PDF. Please try a text-based PDF (not a scanned image).' });
        }

        // 2. Run ATS scoring
        const result = calculateATSScore(resumeText, jobRole);

        // 3. Save to RESUME table
        const studentId = req.user.entityId;
        const originalName = req.file.originalname || 'resume.pdf';
        const label = versionLabel?.trim() || `v${Date.now().toString().slice(-4)}`;

        let insertColumns = '(s_id, file_url, ats_score, uploaded_on, version_label, is_active';
        let insertValues = [studentId, originalName, result.score, label, 1];
        let placeholders = '?, ?, ?, NOW(), ?, ?';

        const hasExtColumns = await columnExists(pool, 'RESUME', 'role_targeted');
        if (hasExtColumns) {
            insertColumns += ', role_targeted, keywords_found, keywords_missing';
            insertValues.push(
                jobRole,
                JSON.stringify(result.foundKeywords),
                JSON.stringify(result.missingKeywords)
            );
            placeholders += ', ?, ?, ?';
        }
        insertColumns += ')';

        const [insertResult] = await pool.query(
            `INSERT INTO RESUME ${insertColumns} VALUES (${placeholders})`,
            insertValues
        );

        // 4. Clean up temp file
        fs.unlinkSync(filePath);

        // 5. Return full enriched result
        res.json({
            success: true,
            id: insertResult.insertId,
            score: result.score,
            grade: result.grade,
            recommendation: result.recommendation,
            breakdown: result.breakdown,
            foundKeywords: result.foundKeywords,
            missingKeywords: result.missingKeywords,
            bonusKeywords: result.bonusKeywords,
            matchPercentage: result.matchPercentage,
            sections: result.sections,
            formatChecks: result.formatChecks,
            wordCount: result.wordCount,
            jobRole,
            fileName: originalName,
            versionLabel: label,
        });

    } catch (err) {
        console.error('ATS ANALYZE ERROR:', err);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.status(500).json({ error: err.message });
    }
});

// ─── DELETE /api/resumes/:id ──────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Access denied' });
    try {
        const [result] = await pool.query(
            'DELETE FROM RESUME WHERE resume_id = ? AND s_id = ?',
            [req.params.id, req.user.entityId]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Record not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function tryParseJSON(val, fallback) {
    if (!val) return fallback;
    try { return JSON.parse(val); } catch { return fallback; }
}

async function columnExists(pool, table, column) {
    try {
        const [rows] = await pool.query(
            `SELECT COUNT(*) as c FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
            [table, column]
        );
        return rows[0].c > 0;
    } catch { return false; }
}

export default router;
