import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import printModelRoutes from './routes/printModel';
import authRoutes from './routes/auth';
import { errorHandler } from './middleware/errorHandler';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    const isConnected = mongoose.connection.readyState === 1;

    if (isConnected) {
        res.status(200).json({ status: 'OK', message: 'Database is connected' });
    } else {
        res.status(503).json({ status: 'Service Unavailable', message: 'Database disconnected' });
    }
});

app.use(cookieParser());
app.use('/auth', authRoutes);
app.use('/api/models', printModelRoutes);

app.use(errorHandler);

export default app;