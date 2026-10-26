require("dotenv").config()
const express = require("express")
const http = require("http")
const mongoose = require("mongoose")
const { Server } = require("socket.io")
const jwt = require("jsonwebtoken")

const connectDB = require("./config/db")

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000"
  }
});

app.set("io", io)

app.use(express.json({ limit: "100kb" }))

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    next(new Error("Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  socket.join(String(socket.user.id))

  console.log("User connected:", socket.user.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.user.id);
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "Ride-Sharing API is running",
    documentation: "/api/docs"
  });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/drivers", require("./routes/driverRoutes"));
app.use("/api/rides", require("./routes/rideRoutes"));
app.use("/api/ratings", require("./routes/ratingRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));

app.get("/api/docs", (req, res) => {
  res.json({
    title: "Ride-Sharing API",
    authentication: "Bearer JWT",
    endpoints: {
      signup: "POST /api/auth/signup",
      login: "POST /api/auth/login",
      driverLocation: "PATCH /api/auth/driver/location",
      driverAvailability: "PATCH /api/auth/driver/availability",
      drivers: "GET /api/drivers",
      rideRequest: "POST /api/rides",
      rideRequests: "GET /api/rides/requests",
      rideSearch: "GET /api/rides/search",
      rideAction: "PATCH /api/rides/:id/action",
      rideHistory: "GET /api/rides/history",
      exportCSV: "GET /api/rides/history/export?format=csv",
      exportPDF: "GET /api/rides/history/export?format=pdf",
      submitReview: "POST /api/ratings/:rideId",
      driverRating: "GET /api/ratings/driver/:driverId",
      rideAnalytics: "GET /api/analytics/rides",
      driverAnalytics: "GET /api/analytics/drivers",
      serviceAnalytics: "GET /api/analytics/service"
    }
  });
});

app.use((req, res) => {
  res.status(404).json({message: "API endpoint not found"})
});

app.use((error, req, res, next) => {
  console.error(error.message);

  res.status(500).json({
    message: "Something went wrong on the server" })
});

const port = process.env.PORT || 5000

async function startServer() {
  if (!process.env.JWT_SECRET || !process.env.MONGO_URI) {
    throw new Error("JWT_SECRET and MONGO_URI are required");
  }

  await connectDB()

  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Server startup failed:", error.message);
  });
}


module.exports = { app, server, io,startServer }
