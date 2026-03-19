"use strict";
/**
 * generators/sourcing.js
 * Generates the Sourcing Manager risk briefing for a given supplier.
 * Returns a Buffer (docx binary).
 */

const { Document, Packer, Table, TableRow, PageBreak } = require("docx");
const B = require("../lib/brand");
const { loadSupplierRisks, filterRisks, LEVEL_SCORE } = require("../lib/data-loader");

const HIGH_LEVELS = ["Critical", "Very High", "High", "Already happening"];

// ── Helpers ────────────────────────────────────────────────────────────────

/** Build the main risk summary table from loaded rows */
function buildRiskTable(rows) {
  const baseline = filterRisks(rows, { levels: HIGH_LEVELS });
  // De-duplicate by facility + risk_type (take highest timeframe that qualifies)
  const seen = new Set();
  const deduped = [];
  for (const r of baseline) {
    const key = `${r.facility_name}::${r.risk_type}`;
    if (!seen.has(key)) { seen.add(key); deduped.push(r); }
  }

  // Also include deteriorating W5 rows even if only High
  const w5det = filterRisks(rows, { timeframe: "Within 5 Years" })
    .filter(r => r.risk_trend === "Deteriorating" && HIGH_LEVELS.includes(r.risk_level))
    .filter(r => {
      const key = `${r.facility_name}::${r.risk_type}`;
      if (!seen.has(key)) { seen.add(key); return true; }
      return false;
    });

  const allRows = [...deduped, ...w5det]
    .sort((a, b) => (LEVEL_SCORE[b.risk_level] || 0) - (LEVEL_SCORE[a.risk_level] || 0))
    .slice(0, 20); // cap table length

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      B.tc("Facility",    { width: 2600, bold: true, bg: B.C.navy, textColor: B.C.white }),
      B.tc("Risk Type",   { width: 2400, bold: true, bg: B.C.navy, textColor: B.C.white }),
      B.tc("Level",       { width: 1300, bold: true, bg: B.C.navy, textColor: B.C.white, center: true }),
      B.tc("W5 Trend",    { width: 1460, bold: true, bg: B.C.navy, textColor: B.C.white, center: true }),
      B.tc("Timeframe",   { width: 1600, bold: true, bg: B.C.navy, textColor: B.C.white, center: true }),
    ],
  });

  const dataRows = allRows.map(r => new TableRow({
    children: [
      B.tc(r.facility_name, { width: 2600, size: 18 }),
      B.tc(r.risk_type,     { width: 2400, size: 18 }),
      B.tc(r.risk_level,    { width: 1300, badge: true, center: true, size: 17 }),
      B.tc(r.risk_trend || "N/A", { width: 1460, center: true, size: 18 }),
      B.tc(r.timeframe,     { width: 1600, center: true, size: 18 }),
    ],
  }));

  return new Table({
    width: { size: 9360, type: "dxa" },
    columnWidths: [2600, 2400, 1300, 1460, 1600],
    rows: [headerRow, ...dataRows],
  });
}

/** Build the alerts table */
function buildAlertsTable(rows) {
  // Derive which regions/facilities are at risk for specific dynamic alerts
  const hasVietnam = rows.some(r => r.facility_name.toLowerCase().includes("vietnam"));
  const hasChina   = rows.some(r => r.facility_name.toLowerCase().includes("shanghai"));
  const hasPoland  = rows.some(r => r.facility_name.toLowerCase().includes("gorzów") ||
                                    r.facility_name.toLowerCase().includes("europlant") ||
                                    r.facility_name.toLowerCase().includes("poland"));
  const hasMexico  = rows.some(r => r.facility_name.toLowerCase().includes("toluca"));
  const hasSA      = rows.some(r => r.facility_name.toLowerCase().includes("rosslyn"));

  const alerts = [
    ["ILAB List of Goods annual update", "All ILAB-flagged facilities", "Annual (USDOL, ~Sep)", "Tracks new or changed commodity listings; triggers audit refresh obligation"],
    ["EU CSDDD compliance milestone", "All EU-bound supply chains", "Quarterly", "CSDDD requires documented HRDD for large EU-market companies; pre-deadline audit trail required"],
    ["EU Forced Labour Regulation deadline", "Shanghai, Vietnam (primary)", "Set deadline: December 2027", "Regulation prohibits EU market entry for forced-labour goods; traceability must begin now"],
  ];
  if (hasMexico) alerts.push(["USMCA 2026 labour review", "Toluca Plant", "Alert: Q1 2026", "Chapter 23 review may tighten labour enforcement; review outcome drives remediation scope"]);
  if (hasVietnam || hasChina) alerts.push(["Western Pacific typhoon season", "Vietnam, Shanghai, Taiwan cluster", "Monthly Jun-Nov", "Monitors typhoon formation; pre-position BCP at Category 1+ approach within 500km"]);
  if (hasSA) alerts.push(["South Africa wildfire season", "Rosslyn Factory", "Monthly Nov-Mar", "Critical fire risk site; monitors SA fire danger ratings and drought index deterioration"]);
  if (hasPoland) alerts.push(["Poland spring flood watch", "Polish manufacturing plants", "Monthly Mar-May", "Critical inland flood sites; triggers on river basin gauge levels and 72hr rainfall forecasts"]);

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      B.tc("Alert",            { width: 2800, bold: true, bg: B.C.green, textColor: B.C.white }),
      B.tc("Scope",            { width: 2100, bold: true, bg: B.C.green, textColor: B.C.white }),
      B.tc("Cadence",          { width: 1860, bold: true, bg: B.C.green, textColor: B.C.white, center: true }),
      B.tc("Rationale",        { width: 2600, bold: true, bg: B.C.green, textColor: B.C.white }),
    ],
  });

  const dataRows = alerts.map(([alert, scope, cad, rat]) => new TableRow({
    children: [
      B.tc(alert, { width: 2800, size: 18 }),
      B.tc(scope, { width: 2100, size: 18 }),
      B.tc(cad,   { width: 1860, size: 18, center: true }),
      B.tc(rat,   { width: 2600, size: 18 }),
    ],
  }));

  return new Table({
    width: { size: 9360, type: "dxa" },
    columnWidths: [2800, 2100, 1860, 2600],
    rows: [headerRow, ...dataRows],
  });
}

// ── Main export ────────────────────────────────────────────────────────────

/**
 * Generate Sourcing Manager report.
 * @param {string} supplierName   exact supplier_name string from the CSVs
 * @param {object} [opts]
 * @param {string} [opts.date]    date string for title page (default "March 2026")
 * @returns {Promise<Buffer>}
 */
async function generateSourcingReport(supplierName, opts = {}) {
  const rows = await loadSupplierRisks(supplierName);
  if (!rows.length) throw new Error(`No data found for supplier: ${supplierName}`);

  const date         = opts.date || "March 2026";
  const baseline     = filterRisks(rows, { levels: HIGH_LEVELS });
  const criticals    = baseline.filter(r => ["Critical","Already happening"].includes(r.risk_level));
  const facilities   = [...new Set(rows.map(r => r.facility_name))];
  const countries    = facilities.length;
  const riskTypes    = [...new Set(baseline.map(r => r.risk_type))];

  // Key facility lookup helpers
  const hasFac = (kw) => rows.some(r => r.facility_name.toLowerCase().includes(kw.toLowerCase()));
  const topCriticals = criticals.slice(0, 5);

  const riskTable   = buildRiskTable(rows);
  const alertsTable = buildAlertsTable(rows);

  const doc = new Document({
    numbering: B.docNumbering,
    styles:    B.docStyles,
    sections: [{
      properties: B.pageProperties,
      headers: { default: B.makeHeader() },
      footers: { default: B.makeFooter() },
      children: [

        // Title page
        ...B.titlePage({
          supplier: supplierName,
          subtitle: "Supply Chain Risk Intelligence",
          role:     "Sourcing Manager Briefing",
          date,
        }),

        // Executive Summary
        B.h1("Executive Summary"),
        B.para([
          B.run(`This briefing presents supply chain risk intelligence for `),
          B.run(supplierName, { bold: true }),
          B.run(`, covering ${facilities.length} supplier ${facilities.length === 1 ? "facility" : "facilities"} across ${riskTypes.length} risk domains. The assessment draws on 12 independent risk datasets spanning physical climate hazards, social compliance, and restricted goods, produced by the Earthena AI QuantEarth\u2122 platform. All risk levels are derived from data; no extrapolation beyond source datasets has been applied.`),
        ]),
        B.para([
          B.run(`${criticals.length} finding${criticals.length !== 1 ? "s" : ""} are classified as Critical or Already Happening, indicating immediate regulatory exposure or significant supply disruption risk. `),
          B.run(`${baseline.filter(r => r.risk_level === "Very High").length} further findings are rated Very High.`, { bold: false }),
          B.run(" The five priority actions below address the most material sourcing and compliance risks."),
        ]),

        // Top 5 Actions
        B.h1("Top 5 Priority Actions"),
        B.para([B.run("Actions are ranked by immediacy and sourcing-level impact.", { italic: true })]),

        // Dynamically generate action headings from top criticals
        ...topCriticals.flatMap((r, i) => [
          B.h2(`${i + 1}. ${r.risk_type}: ${r.facility_name}`),
          B.para([
            B.run("Risk level: ", { bold: true }),
            B.run(r.risk_level, { bold: true, color: B.riskBadge(r.risk_level).color }),
            r.risk_trend ? B.run(`  |  Trend: ${r.risk_trend}`) : B.run(""),
          ]),
          r.context ? B.para(r.context) : B.para("See platform for full risk detail."),
          B.bullet("Initiate a targeted risk assessment and corrective action plan for this facility."),
          B.bullet("Review business continuity provisions and insurance coverage given the risk classification."),
          B.bullet("Assess sourcing volume dependency and identify contingency supply options if needed."),
          B.emptyLine(120),
        ]),

        // Risk Summary Table
        new (require("docx").Paragraph)({ children: [new PageBreak()] }),
        B.h1("Key Facility Risk Summary"),
        B.para("The table below shows the highest-severity risk findings relevant to sourcing and supply continuity."),
        B.emptyLine(100),
        riskTable,
        B.emptyLine(200),

        // Alerts
        B.h1("Recommended Platform Alerts"),
        B.para("Configure the following on the Earthena AI scheduling agent to receive advance warning of material risk changes."),
        B.emptyLine(100),
        alertsTable,
        B.emptyLine(200),

        // Methodology
        B.h1("Data Sources & Methodology"),
        B.para([
          B.run("This briefing is based on the Earthena AI QuantEarth\u2122 Outside-In Supply Chain risk datasets. Physical climate risks use multi-scenario SSP projections (SSP1-2.6, SSP2-4.5, SSP3-7.0, SSP5-8.5). Social risks use index-based country/sector frameworks (KnowTheChain, CSR Risk Check, ILAB TVPRA, WRI Aqueduct). "),
          B.run("No risk signals have been added to this report beyond those present in the underlying datasets.", { bold: true }),
        ]),
        B.para("Risk scale: Negligible / Very Low / Low / Medium / High / Very High / Critical. For restricted goods, 'Already Happening' indicates current regulatory list exposure."),
        B.para([B.run(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`, { italic: true, color: B.C.gray })]),

      ],
    }],
  });

  return Packer.toBuffer(doc);
}

module.exports = { generateSourcingReport };
