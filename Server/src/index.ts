import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import routes from "./routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "I AM THE NEW SERVER",
  });
});

app.use("/api/races", routes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
