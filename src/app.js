const express = require("express");
require("express-async-errors");

const eventRoutes = require("./routes/event.routes");

const app = express();

app.use(express.json());

// Routes
app.use("/events", eventRoutes);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

module.exports = app;
