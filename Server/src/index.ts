import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import routes from "./routes";
// Registers every schema with mongoose so `ref`/populate() resolve.
import "./models";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/races", routes);


async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);

    console.log("✅ MongoDB Connected");

  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
}


connectDB().then(() => {

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });

});