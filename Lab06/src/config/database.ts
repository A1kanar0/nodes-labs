import mongoose, {mongo} from "mongoose";

export const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;

        if (!uri) {
            throw new Error("MongoDB URL is missing");
        }

        await mongoose.connect(uri);
        console.log("MongoDB Connected");

        mongoose.connection.on('error', (err) => {
            console.error(err);
        });
        mongoose.connection.on('disconnected', () => {
            console.warn("MongoDB Disconnected");
        })
    } catch (error) {
        console.error('Critical error:', error);
        process.exit(1);
    }
}