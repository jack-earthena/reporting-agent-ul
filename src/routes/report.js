"use strict";
const { promisify } = require("util");
const libre = require("libreoffice-convert");
const { generateReport } = require("../generators/index");
const { validateGenerateReport } = require("../middleware/validation");
const router = require("express").Router();

const libreConvertAsync = promisify(libre.convert);

/**
 * POST /api/report
 * Body: { supplier: string, type: "sourcing"|"operations"|"sustainability"|"executive", date?: string }
 * Returns: JSON { docx: "<base64>", pdf: "<base64>" | null }
 * pdf is null if LibreOffice conversion fails (LibreOffice not installed).
 */
router.post("/", validateGenerateReport, async (req, res, next) => {
  const { supplier, type, date } = req.body;
  try {
    console.log(`[${new Date().toISOString()}] Generating ${type} report for: ${supplier}`);
    const docxBuffer = await generateReport(supplier, type, { date });

    let pdfBase64 = null;
    try {
      const pdfBuffer = await libreConvertAsync(docxBuffer, ".pdf", undefined);
      pdfBase64 = Buffer.from(pdfBuffer).toString("base64");
    } catch (convErr) {
      console.warn(`[${new Date().toISOString()}] PDF conversion failed (LibreOffice required):`, convErr.message);
    }

    const docxBase64 = docxBuffer.toString("base64");
    res.json({ docx: docxBase64, pdf: pdfBase64 });
  } catch (err) {
    if (err.message.startsWith("No data found")) {
      err.status = 404;
    }
    next(err);
  }
});

module.exports = router;
