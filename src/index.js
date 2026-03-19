"use strict";
require("dotenv").config();
const express     = require("express");
const cors        = require("cors");
const rateLimit   = require("express-rate-limit");
const suppliersRouter = require("./routes/suppliers");
const reportRouter    = require("./routes/report");
const errorHandler    = require("./middleware/error-handler");

const app  = express();
const PORT = process.env.PORT || 3081;

// ── CORS ───────────────────────────────────────────────────────────────────
// These origins are always allowed (never overridden)
const BASE_ALLOWED_ORIGINS = [
  "https://holocene-demo-alpha.lovable.app",
  "https://id-preview--5a62631f-7f03-4dd4-97d6-f5f00fac202e.lovable.app",
];
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? [...BASE_ALLOWED_ORIGINS, ...process.env.ALLOWED_ORIGINS.split(",").map(s => s.trim()).filter(Boolean)]
  : BASE_ALLOWED_ORIGINS;

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.options("*", cors());

// ── Body parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));

// ── Rate limiting ──────────────────────────────────────────────────────────
app.use("/api/report", rateLimit({
  windowMs: 60_000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT || "20"),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests; please try again shortly." },
}));

// ── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/suppliers", suppliersRouter);
app.use("/api/report",    reportRouter);

app.get("/health", (req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() })
);

// ── Error handler ──────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () =>
  console.log(`[reporting-agent] Listening on port ${PORT}  |  NODE_ENV=${process.env.NODE_ENV || "development"}`)
);

module.exports = app; // for testing
