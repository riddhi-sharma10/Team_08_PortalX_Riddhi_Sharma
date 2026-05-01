// server/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { fileURLToPath } from 'url';
dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)) });

const app = express();

// MIDDLEWARE
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Request X-Ray Logger (Prints all incoming API calls to server terminal)
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// IMPORT ROUTES (each file handles one type of data)
import authRouter from './routes/auth.js';
import studentsRouter from './routes/students.js';
import companiesRouter from './routes/companies.js';
import applicationsRouter from './routes/applications.js';
import analyticsRouter from './routes/analytics.js';
import viewsRouter from './routes/views.js';
import proceduresRouter from './routes/procedures.js';
import jobsRouter from './routes/jobs.js';
import adminRouter from './routes/admin.js';
import resumesRouter from './routes/resumes.js';
import coordinatorRouter from './routes/coordinator.js';

// REGISTER ROUTES
// Any request to /api/auth/* → goes to auth.js
// Any request to /api/students/* → goes to students.js
// etc.
app.use('/api/auth', authRouter);
app.use('/api/students', studentsRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/views', viewsRouter);
app.use('/api/procedures', proceduresRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/resumes', resumesRouter);
app.use('/api/coordinator', coordinatorRouter);

// Health check (open this in browser to test: http://localhost:3001/api/health)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running!' });
});

// START SERVER
const PORT = process.env.PORT || 3001;

// Global Error Handler (Prevents "Unexpected token" HTML crashes)
app.use((err, req, res, next) => {
    console.error('SERVER CRASH:', err);
    res.status(500).json({ 
        status: 'error', 
        message: err.message || 'Internal Server Error',
        details: err.stack ? 'Check server logs for details' : undefined
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Backend server running at http://localhost:${PORT}`);
});
