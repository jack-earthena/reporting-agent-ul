"use strict";
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} -> ${status}: ${err.message}`);
  res.status(status).json({ error: err.message || "Internal server error" });
}
module.exports = errorHandler;
