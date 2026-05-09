import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import printModelRoutes from './routes/printModel';
import { errorHandler } from './middleware/errorHandler';

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

app.use('/api/models', printModelRoutes);

app.use(errorHandler);

export default app;