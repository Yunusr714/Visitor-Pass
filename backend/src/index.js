require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { ensureUploadsDirs, uploadsRoot } = require('./utils/uploads');

const { connectDB } = require('./lib/db');
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const visitorsRouter = require('./routes/visitors');
const appointmentsRouter = require('./routes/appointments');
const passesRouter = require('./routes/passes');
const checkLogsRouter = require('./routes/checkLogs');
const publicRouter = require('./routes/public');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
ensureUploadsDirs();
app.use('/uploads', express.static(uploadsRoot));

app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/visitors', visitorsRouter);
app.use('/appointments', appointmentsRouter);
app.use('/passes', passesRouter);
app.use('/check-logs', checkLogsRouter);
app.use('/public', publicRouter);

const PORT = process.env.PORT || 4000;

async function start() {
  await connectDB();
  app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
}
start().catch((err) => { console.error('Failed to start server:', err); process.exit(1); });

module.exports = app;