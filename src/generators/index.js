"use strict";
const { generateSourcingReport }      = require("./sourcing");
const { generateOperationsReport }    = require("./operations");
const { generateSustainabilityReport } = require("./sustainability");
const { generateExecutiveReport }     = require("./executive");

const REPORT_TYPES = ["sourcing", "operations", "sustainability", "executive"];

async function generateReport(supplierName, type, opts = {}) {
  switch (type) {
    case "sourcing":       return generateSourcingReport(supplierName, opts);
    case "operations":     return generateOperationsReport(supplierName, opts);
    case "sustainability": return generateSustainabilityReport(supplierName, opts);
    case "executive":      return generateExecutiveReport(supplierName, opts);
    default: throw new Error(`Unknown report type "${type}". Valid: ${REPORT_TYPES.join(", ")}`);
  }
}

module.exports = { generateReport, generateSourcingReport, generateOperationsReport, generateSustainabilityReport, generateExecutiveReport, REPORT_TYPES };
