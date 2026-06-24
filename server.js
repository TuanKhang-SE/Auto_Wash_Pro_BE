import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";

import authRoute from "./src/routes/authRoute.js";
import setupSwagger from "./src/config/swagger.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Setup Swagger
setupSwagger(app);

// Home Route
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Server is running 🚀",
  });
});

// Auth Routes
app.use("/api/auth", authRoute);

// Branch Routes
import branchRoute from "./src/routes/branchRoute.js";
app.use("/api/branches", branchRoute);

// User Routes
import userRoute from "./src/routes/userRoute.js";
app.use("/api/users", userRoute);

// Service Routes
import serviceRoute from "./src/routes/serviceRoute.js";
app.use("/api/services", serviceRoute);

// Branch Services Route
import branchServiceRoute from "./src/routes/branchServiceRoute.js";
app.use("/api/branch-services", branchServiceRoute);

// Vehicle Routes
import vehicleRoute from "./src/routes/vehicleRoute.js";
app.use("/api/vehicles", vehicleRoute);

// Shift Routes
import shiftRoute from "./src/routes/shiftRoute.js";
app.use("/api/shifts", shiftRoute);

// Customer Routes
import customerRoute from "./src/routes/customerRoute.js";
app.use("/api/customers", customerRoute);

// Staff Schedule Routes
import staffScheduleRoute from "./src/routes/staffScheduleRoute.js";
app.use("/api/staff-schedules", staffScheduleRoute);

// Branch Config Routes
import branchConfigRoute from "./src/routes/branchConfigRoute.js";
app.use("/api/branch-configs", branchConfigRoute);

// Booking Routes
import bookingRoute from "./src/routes/bookingRoute.js";
app.use("/api/bookings", bookingRoute);

// Staff Operations Routes
import staffOperationRoute from "./src/routes/staffOperationRoute.js";
app.use("/api/staff-operations", staffOperationRoute);

// Transaction Routes
import transactionRoute from "./src/routes/transactionRoute.js";
app.use("/api/transactions", transactionRoute);

// Start Server
app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});
