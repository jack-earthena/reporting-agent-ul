"use strict";
const express = require("express");
const { listSuppliers, getSupplierSummary } = require("../lib/data-loader");
const router = express.Router();

// GET /api/suppliers  — list all unique supplier names
router.get("/", async (req, res, next) => {
  try {
    const suppliers = await listSuppliers();
    res.json({ suppliers });
  } catch (err) { next(err); }
});

// GET /api/suppliers/:name/summary  — risk summary JSON for one supplier
router.get("/:name/summary", async (req, res, next) => {
  try {
    const summary = await getSupplierSummary(req.params.name);
    if (!summary) return res.status(404).json({ error: `Supplier not found: ${req.params.name}` });
    res.json(summary);
  } catch (err) { next(err); }
});

module.exports = router;
