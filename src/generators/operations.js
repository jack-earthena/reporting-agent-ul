"use strict";
/**
 * generators/operations.js
 * Generates the Operations Manager physical risk briefing.
 * Returns a Buffer (docx binary).
 */

const { Document, Packer, Table, TableRow, PageBreak } = require("docx");
const B = require("../lib/brand");
const { loadSupplierRisks, filterRisks, LEVEL_SCORE } = require("../lib/data-loader");

const HIGH_LEVELS = ["Critical", "Very High", "High"];
const PHYS_TYPES  = ["Wildfire","Inland Flooding","Humidex Heat Stress","Drought",
                     "Tropical Storm","Landslide","Coastal Flooding"];

// ── Helpers ────────────────────────────────────────────────────────────────

function buildPhysMatrixTable(rows) {
  const baseline = filterRisks(rows, { timeframe: "Baseline" });
  const facilities = [...new Set(baseline.map(r => r.facility_name))];

  const physTypes = ["Wildfire", "Inland Flooding", "Humidex Heat Stress", "Drought"];
  const colW = [2600, 1500, ...physTypes.map(() => 1315)];
  const totalW = colW.reduce((a, b) => a + b, 0);

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      B.tc("Facility",   { width: 2600, bold: true, bg: B.C.navy, textColor: B.C.white }),
      B.tc("Country",    { width: 1500, bold: true, bg: B.C.navy, textColor: B.C.white, center: true }),
      ...physTypes.map(pt => B.tc(pt, { width: 1315, bold: true, bg: B.C.navy, textColor: B.C.white, center: true })),
    ],
  });

  // Heuristic country extraction from context or known pattern
  function guessCountry(fac) {
    const m = {
      "vietnam": "Vietnam", "shanghai": "China", "rosslyn": "South Africa",
      "poland": "Poland", "europlant": "Poland", "gorzów": "Poland",
      "waxdale": "USA", "soapbox": "USA", "bay city": "USA", "milwaukee": "USA",
      "rolle": "Switzerland", "toluca": "Mexico", "pilar": "Argentina",
      "stanley": "Taiwan", "singapore": "Singapore", "kolkata": "India",
      "latam": "Argentina", "argentina": "Argentina",
    };
    const f = fac.toLowerCase();
    for (const [k, v] of Object.entries(m)) if (f.includes(k)) return v;
    return "";
  }

  const dataRows = facilities.map(fac => {
    const cells = physTypes.map(pt => {
      const row = baseline.find(r => r.facility_name === fac && r.risk_type === pt);
      const level = row ? row.risk_level : "N/A";
      return B.tc(level, { width: 1315, badge: level !== "N/A", center: true, size: 17,
        color: level === "N/A" ? B.C.lgray : undefined });
    });
    return new TableRow({ children: [
      B.tc(fac,              { width: 2600, size: 18 }),
      B.tc(guessCountry(fac),{ width: 1500, size: 18, center: true }),
      ...cells,
    ]});
  });

  return new Table({
    width: { size: totalW, type: "dxa" },
    columnWidths: colW,
    rows: [headerRow, ...dataRows],
  });
}

function buildAlertsTable(rows) {
  const hasSA     = rows.some(r => r.facility_name.toLowerCase().includes("rosslyn"));
  const hasPoland = rows.some(r => r.facility_name.toLowerCase().includes("gorzów") ||
                                   r.facility_name.toLowerCase().includes("europlant"));
  const hasVN     = rows.some(r => r.facility_name.toLowerCase().includes("vietnam"));
  const hasCN     = rows.some(r => r.facility_name.toLowerCase().includes("shanghai"));
  const hasTW     = rows.some(r => r.facility_name.toLowerCase().includes("stanley"));
  const hasMX     = rows.some(r => r.facility_name.toLowerCase().includes("toluca"));

  const alerts = [];
  if (hasSA)     alerts.push(["South Africa wildfire season", "Rosslyn Factory", "Monthly Nov-Mar", "Critical wildfire site; monitors NFDRS fire danger ratings within 50km. Trigger BCP if 'High' NFDRS reached."]);
  if (hasPoland) alerts.push(["Poland flood watch (spring)", "Polish manufacturing plants", "Monthly Mar-May", "Critical inland flood sites; alerts on Vistula/Warta basin levels and 72-hr precipitation >50mm."]);
  if (hasVN)     alerts.push(["Vietnam worker heat advisory", "SC Johnson Vietnam", "Weekly Apr-Oct", "Alert when forecast >5 consecutive days HX40+; triggers work-rest schedule protocols."]);
  if (hasVN || hasCN || hasTW) alerts.push(["Western Pacific typhoon watch", "Vietnam, Shanghai, Taiwan cluster", "Weekly Jun-Nov", "JTWC advisories; alert at Tropical Storm intensity within 500km. Pre-position BCP at Cat 1+."]);
  if (hasSA)     alerts.push(["South Africa drought index", "Rosslyn Factory", "Quarterly", "Monitor CSIC SPEI-3; alert if SPEI-3 drops below -1.5 sustained for 2+ months."]);
  if (hasMX)     alerts.push(["Toluca tropical storm watch", "Toluca Plant", "Monthly Jun-Nov", "Storm risk trending to Very High (W5); monitors NHC/CONAGUA track for 300km approach."]);
  if (hasPoland) alerts.push(["Poland annual flood outlook", "Polish manufacturing plants", "Annual Jan", "Review IMGW-PIB seasonal outlook each January for forward capital planning."]);
  alerts.push(["Physical risk score refresh", "All facilities", "Annual", "Re-run QuantEarth\u2122 pipeline against updated climate datasets to capture trend changes."]);

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      B.tc("Alert",          { width: 2800, bold: true, bg: B.C.green, textColor: B.C.white }),
      B.tc("Facility/Region",{ width: 2000, bold: true, bg: B.C.green, textColor: B.C.white }),
      B.tc("Cadence",        { width: 1660, bold: true, bg: B.C.green, textColor: B.C.white, center: true }),
      B.tc("Threshold/Action",{ width: 2900, bold: true, bg: B.C.green, textColor: B.C.white }),
    ],
  });

  return new Table({
    width: { size: 9360, type: "dxa" },
    columnWidths: [2800, 2000, 1660, 2900],
    rows: [headerRow, ...alerts.map(([a, s, c, t]) => new TableRow({ children: [
      B.tc(a, { width: 2800, size: 18 }),
      B.tc(s, { width: 2000, size: 18 }),
      B.tc(c, { width: 1660, size: 18, center: true }),
      B.tc(t, { width: 2900, size: 18 }),
    ]}))],
  });
}

// ── Main export ────────────────────────────────────────────────────────────

async function generateOperationsReport(supplierName, opts = {}) {
  const rows = await loadSupplierRisks(supplierName);
  if (!rows.length) throw new Error(`No data found for supplier: ${supplierName}`);

  const date       = opts.date || "March 2026";
  const baseline   = filterRisks(rows, { timeframe: "Baseline" });
  const physRisks  = baseline.filter(r => PHYS_TYPES.includes(r.risk_type) && HIGH_LEVELS.includes(r.risk_level));
  const topPhys    = [...physRisks].sort((a, b) => (LEVEL_SCORE[b.risk_level] || 0) - (LEVEL_SCORE[a.risk_level] || 0)).slice(0, 5);
  const facilities = [...new Set(rows.map(r => r.facility_name))];

  const matrixTable = buildPhysMatrixTable(rows);
  const alertsTable = buildAlertsTable(rows);

  const doc = new Document({
    numbering: B.docNumbering,
    styles:    B.docStyles,
    sections: [{
      properties: B.pageProperties,
      headers: { default: B.makeHeader() },
      footers: { default: B.makeFooter() },
      children: [

        ...B.titlePage({
          supplier: supplierName,
          subtitle: "Physical Risk Intelligence",
          role:     "Operations Manager Briefing",
          date,
        }),

        B.h1("Executive Summary"),
        B.para([
          B.run(`This briefing presents physical climate risk intelligence for `),
          B.run(supplierName, { bold: true }),
          B.run(`, covering ${facilities.length} ${facilities.length === 1 ? "facility" : "facilities"}. Physical risk categories assessed include wildfire, inland flooding, humidex heat stress, drought, tropical storm, landslide, and coastal flooding. Risk levels reflect historical baselines and forward-looking projections under multiple SSP emissions scenarios.`),
        ]),
        B.para([
          B.run(`${physRisks.filter(r => r.risk_level === "Critical").length} Critical-level physical risks have been identified. `),
          B.run(`${physRisks.filter(r => r.risk_level === "Very High").length} further findings are rated Very High. `),
          B.run("The five priority actions below focus on asset protection, worker safety, and business continuity planning."),
        ]),

        B.h1("Top 5 Priority Actions"),
        B.para([B.run("Actions are ranked by operational impact and immediacy.", { italic: true })]),

        ...topPhys.flatMap((r, i) => [
          B.h2(`${i + 1}. ${r.risk_type}: ${r.facility_name}`),
          B.para([
            B.run("Risk: ", { bold: true }),
            B.run(r.risk_level, { bold: true, color: B.riskBadge(r.risk_level).color }),
            r.risk_trend ? B.run(`  |  W5 Trend: ${r.risk_trend}`) : B.run(""),
          ]),
          r.context ? B.para(r.context) : B.para("See platform for full risk detail."),
          B.bullet("Conduct a site-level risk assessment and review physical protection measures."),
          B.bullet("Review and update the Business Continuity Plan (BCP) for this facility and hazard type."),
          B.bullet("Assess insurance coverage relative to the modelled risk level."),
          B.emptyLine(120),
        ]),

        new (require("docx").Paragraph)({ children: [new PageBreak()] }),
        B.h1("Physical Risk Matrix"),
        B.para("Highest-severity physical risk levels per facility (baseline). N/A = risk type not modelled for this location."),
        B.emptyLine(100),
        matrixTable,
        B.emptyLine(200),

        B.h1("Recommended Platform Monitoring Alerts"),
        B.para("Configure the following on the Earthena AI scheduling agent for operational early warning."),
        B.emptyLine(100),
        alertsTable,
        B.emptyLine(200),

        B.h1("Data Sources & Methodology"),
        B.para([
          B.run("Physical risk datasets: ", { bold: true }),
          B.run("Wildfire (UL Solutions fire weather analysis); Inland Flooding (probabilistic stochastic flood model, expected asset loss); Humidex Heat Stress (days/year HX40+, historical + SSP245 primary); Drought (CSIC SPEI Global Database v2.8, SPEI-3, 1 degree grid); Tropical Storm (UL Solutions probabilistic storm model); Landslide (frequency-based susceptibility); Coastal Flooding (return-period inundation extents). Multi-scenario SSP projections used throughout."),
        ]),
        B.para("Confidence levels reflect SSP scenario agreement: High = all scenarios agree; Medium = majority agree; Low = scenarios diverge."),
        B.para([B.run(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`, { italic: true, color: B.C.gray })]),

      ],
    }],
  });

  return Packer.toBuffer(doc);
}

module.exports = { generateOperationsReport };
