"use strict";
const { REPORT_TYPES } = require("../generators/index");

function validateGenerateReport(req, res, next) {
  const { supplier, type } = req.body;
  if (!supplier || typeof supplier !== "string" || !supplier.trim())
    return res.status(400).json({ error: "supplier is required (string)" });
  if (!type || !REPORT_TYPES.includes(type))
    return res.status(400).json({ error: `type must be one of: ${REPORT_TYPES.join(", ")}` });
  next();
}

module.exports = { validateGenerateReport };
