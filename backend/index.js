import express from "express";
import dns from "dns";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.route.js";

dotenv.config();

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json()); // allow express to parse JSON data in request body
app.use(cookieParser()); // allow express to parse cookies in request headers

app.get("/health", (req, res) => {
  res.send("Server is healthy");
});

app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}`);
});


