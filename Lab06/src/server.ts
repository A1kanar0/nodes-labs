import dotenv from 'dotenv';
dotenv.config();
import app from './app';
import {connectDB} from "./config/database";
import mongoose from "mongoose";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    await connectDB();
    const server = app.listen(PORT as number, '0.0.0.0', () => {
        console.log(`Server started on port ${PORT} and listening on 0.0.0.0`);
    });

    const gracefulShutdown = async (signal: string) => {
        console.log(`Graceful shutdown for ${signal}`);
        server.close(async () => {
            console.log(`Server closed.`);

            try {
                await mongoose.connection.close();
                console.log(`Server connection closed.`);
                process.exit(0);
            } catch (error) {
                console.error(error);
                process.exit(1);
            }
        });
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

startServer();