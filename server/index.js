// server/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { fileURLToPath } from 'url';
dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)) });

const app = express();

// MIDDLEWARE
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

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
import chatRouter from './routes/chat.js';
import notificationsRouter from './routes/notifications.js';
import queriesRouter from './routes/queries.js';

// REGISTER ROUTES
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
app.use('/api/chat', chatRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/queries', queriesRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running!' });
});

import { addClient } from './sse.js';
app.get('/api/stream', (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).send('Missing userId');
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Establish SSE with client

    addClient(userId, res);
});

// START SERVER
const PORT = process.env.PORT || 3001;

// Global Error Handler
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
