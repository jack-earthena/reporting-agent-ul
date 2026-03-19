"use strict";
/**
 * generators/sustainability.js
 * Generates the ESG & Responsible Sourcing briefing.
 * Returns a Buffer (docx binary).
 */

const { Document, Packer, Table, TableRow, PageBreak } = require("docx");
const B = require("../lib/brand");
const { loadSupplierRisks, filterRisks, LEVEL_SCORE } = require("../lib/data-loader");

const ALL_LEVELS     = ["Critical", "Very High", "High", "Medium", "Already happening"];
const SOCIAL_TYPES   = ["Child Labour","Modern Slavery","Worker Rights - Labour Rights",
                        "Worker Rights - Remuneration","Restricted Goods - Forced Labor",
                        "Restricted Goods - Child Labor","Restricted Goods - Forced Labour"];
const PHYS_TYPES     = ["Wildfire","Inland Flooding","Humidex Heat Stress","Drought",
                        "Tropical Storm","Landslide","Coastal Flooding","Waste Water"];

// ── Helpers ────────────────────────────────────────────────────────────────

function buildHRTable(rows) {
  const baseline   = filterRisks(rows, { timeframe: "Baseline" });
  const socialRows = baseline.filter(r =>
    SOCIAL_TYPES.some(t => r.risk_type.startsWith(t.split(" - ")[0]))
    && ALL_LEVELS.includes(r.risk_level)
  );

  // Group by facility
  const byFac = {};
  for (const r of socialRows) {
    if (!byFac[r.facility_name]) byFac[r.facility_name] = [];
    byFac[r.facility_name].push(r);
  }

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      B.tc("Facility",          { width: 2400, bold: true, bg: B.C.navy, textColor: B.C.white }),
      B.tc("Highest Level",     { width: 1400, bold: true, bg: B.C.navy, textColor: B.C.white, center: true }),
      B.tc("Risk Types",        { width: 2160, bold: true, bg: B.C.navy, textColor: B.C.white }),
      B.tc("Regulatory Flags",  { width: 1800, bold: true, bg: B.C.navy, textColor: B.C.white }),
      B.tc("Priority Action",   { width: 1600, bold: true, bg: B.C.navy, textColor: B.C.white }),
    ],
  });

  const dataRows = Object.entries(byFac).map(([fac, facRows]) => {
    const highest = facRows.reduce((best, r) =>
      (LEVEL_SCORE[r.risk_level] || 0) > (LEVEL_SCORE[best.risk_level] || 0) ? r : best, facRows[0]);
    const types   = [...new Set(facRows.map(r => r.risk_type))].join(", ");
    const flags   = facRows.some(r => r.risk_type.includes("Restricted")) ? "ILAB / CSDDD" : "None";
    const action  = highest.risk_level === "Already happening"
      ? "Immediate audit + HRDD documentation"
      : highest.risk_level === "Critical" || highest.risk_level === "Very High"
        ? "Social audit required within 90 days"
        : "Include in annual supplier review";

    return new TableRow({ children: [
      B.tc(fac,           { width: 2400, size: 18 }),
      B.tc(highest.risk_level, { width: 1400, badge: true, center: true, size: 17 }),
      B.tc(types,         { width: 2160, size: 17 }),
      B.tc(flags,         { width: 1800, size: 17, color: flags !== "None" ? B.C.critical : B.C.black }),
      B.tc(action,        { width: 1600, size: 17 }),
    ]});
  });

  return new Table({
    width: { size: 9360, type: "dxa" },
    columnWidths: [2400, 1400, 2160, 1800, 1600],
    rows: [headerRow, ...dataRows],
  });
}

function buildClimateTable(rows) {
  const physBaseline = filterRisks(rows, { timeframe: "Baseline" })
    .filter(r => PHYS_TYPES.includes(r.risk_type) && ["Critical","Very High"].includes(r.risk_level));

  const seen = new Set();
  const deduped = physBaseline.filter(r => {
    if (seen.has(r.facility_name)) return false;
    seen.add(r.facility_name);
    return true;
  });

  const w5 = filterRisks(rows, { timeframe: "Within 5 Years" })
    .filter(r => PHYS_TYPES.includes(r.risk_type) && r.risk_trend === "Deteriorating"
                 && ["Critical","Very High","High"].includes(r.risk_level)
                 && !seen.has(r.facility_name));

  const allRows = [...deduped, ...w5].sort(
    (a, b) => (LEVEL_SCORE[b.risk_level] || 0) - (LEVEL_SCORE[a.risk_level] || 0)
  );

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      B.tc("Facility",        { width: 2500, bold: true, bg: B.C.green, textColor: B.C.white }),
      B.tc("Highest Risk",    { width: 2000, bold: true, bg: B.C.green, textColor: B.C.white }),
      B.tc("Level",           { width: 1200, bold: true, bg: B.C.green, textColor: B.C.white, center: true }),
      B.tc("W5 Trend",        { width: 1260, bold: true, bg: B.C.green, textColor: B.C.white, center: true }),
      B.tc("TCFD/CSRD Note",  { width: 2400, bold: true, bg: B.C.green, textColor: B.C.white }),
    ],
  });

  const dataRows = allRows.map(r => {
    const trend = r.risk_trend || "Stable";
    const note = r.risk_level === "Critical"
      ? "Financial materiality; CSRD physical risk quantification required"
      : "Material physical risk; include in TCFD Risks & Opportunities section";
    return new TableRow({ children: [
      B.tc(r.facility_name, { width: 2500, size: 18 }),
      B.tc(r.risk_type,     { width: 2000, size: 18 }),
      B.tc(r.risk_level,    { width: 1200, badge: true, center: true, size: 17 }),
      B.tc(trend,           { width: 1260, center: true, size: 18,
        color: trend === "Deteriorating" ? B.C.critical : B.C.low }),
      B.tc(note,            { width: 2400, size: 17 }),
    ]});
  });

  return new Table({
    width: { size: 9360, type: "dxa" },
    columnWidths: [2500, 2000, 1200, 1260, 2400],
    rows: [headerRow, ...dataRows],
  });
}

function buildRegTable() {
  const regs = [
    ["Now (in force)", "EU CSDDD - HRDD obligations (large companies)", "All facilities with EU-bound goods", "Document human rights due diligence; commission audits"],
    ["Now (in force)", "EUDR - Deforestation-free sourcing obligations",  "Facilities sourcing deforestation-risk commodities", "Establish deforestation-free supply chain traceability"],
    ["Q1 2026",        "USMCA Chapter 23 - 2026 Joint Review",           "Mexico-based facilities", "Prepare evidence of labour standards compliance"],
    ["2026 onwards",   "CSRD double materiality (ESRS E1, S1, S2)",       "All facilities", "Map material impacts, risks, and opportunities for annual report"],
    ["December 2027",  "EU Forced Labour Regulation - market access ban", "Shanghai, Vietnam (key risk)", "Complete traceability programme; document no-link-to-forced-labour evidence"],
    ["2027+",          "TNFD nature-related financial disclosures",        "High water-risk sites", "Align water and biodiversity risk reporting with TNFD framework"],
  ];

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      B.tc("Date",            { width: 1500, bold: true, bg: B.C.navy, textColor: B.C.white, center: true }),
      B.tc("Regulation",      { width: 2800, bold: true, bg: B.C.navy, textColor: B.C.white }),
      B.tc("SCJ Scope",       { width: 2460, bold: true, bg: B.C.navy, textColor: B.C.white }),
      B.tc("Required Action", { width: 2600, bold: true, bg: B.C.navy, textColor: B.C.white }),
    ],
  });

  return new Table({
    width: { size: 9360, type: "dxa" },
    columnWidths: [1500, 2800, 2460, 2600],
    rows: [headerRow, ...regs.map(([d, reg, scope, action]) => new TableRow({ children: [
      B.tc(d,      { width: 1500, size: 17, center: true, bold: d.includes("Now"),
                     color: d.includes("Now") ? B.C.critical : B.C.navy }),
      B.tc(reg,    { width: 2800, size: 18 }),
      B.tc(scope,  { width: 2460, size: 18 }),
      B.tc(action, { width: 2600, size: 18 }),
    ]}))],
  });
}

function buildAlertsTable(rows) {
  const hasCN  = rows.some(r => r.facility_name.toLowerCase().includes("shanghai"));
  const hasVN  = rows.some(r => r.facility_name.toLowerCase().includes("vietnam"));
  const hasMX  = rows.some(r => r.facility_name.toLowerCase().includes("toluca"));
  const hasSA  = rows.some(r => r.facility_name.toLowerCase().includes("rosslyn"));

  const alerts = [
    ["ILAB List of Goods annual update", "All ILAB-flagged facilities", "Annual ~Sep", "Flags new commodity listings; triggers CSDDD and EU FLR scope review"],
    ["EU CSDDD compliance milestone", "All EU-bound supply chains", "Quarterly", "Keeps documented HRDD audit trail current ahead of enforcement deadlines"],
    ["EU Forced Labour Regulation deadline", hasCN || hasVN ? "Shanghai, Vietnam" : "All flagged facilities", "Alert: December 2027", "Market access ban for forced labour goods; traceability must be operational 12 months prior"],
    ["CDP Water Security submission", hasSA ? "Rosslyn Factory" : "Highest water-risk sites", "Annual (alert April)", "Very High waste water sites; CDP Water aligns with CSRD ESRS E3 water disclosure"],
    ["CSRD/TCFD annual reporting calendar", "All facilities", "Annual Jan/Feb", "Triggers updated physical risk scores for Annual Report climate disclosure"],
  ];
  if (hasMX) alerts.push(["USMCA 2026 review", "Toluca Plant", "Alert: Q1 2026", "Treaty review may tighten labour provisions; outcome drives remediation scope"]);
  if (hasSA) alerts.push(["South Africa wildfire season", "Rosslyn Factory", "Monthly Nov-Mar", "Critical wildfire risk; ESG incident reporting and insurance compliance monitoring"]);

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      B.tc("Alert",          { width: 2700, bold: true, bg: B.C.navy, textColor: B.C.white }),
      B.tc("Scope",          { width: 2000, bold: true, bg: B.C.navy, textColor: B.C.white }),
      B.tc("Cadence",        { width: 1660, bold: true, bg: B.C.navy, textColor: B.C.white, center: true }),
      B.tc("ESG Relevance",  { width: 3000, bold: true, bg: B.C.navy, textColor: B.C.white }),
    ],
  });

  return new Table({
    width: { size: 9360, type: "dxa" },
    columnWidths: [2700, 2000, 1660, 3000],
    rows: [headerRow, ...alerts.map(([a, s, c, e]) => new TableRow({ children: [
      B.tc(a, { width: 2700, size: 18 }),
      B.tc(s, { width: 2000, size: 18 }),
      B.tc(c, { width: 1660, size: 18, center: true }),
      B.tc(e, { width: 3000, size: 18 }),
    ]}))],
  });
}

// ── Main export ────────────────────────────────────────────────────────────

async function generateSustainabilityReport(supplierName, opts = {}) {
  const rows = await loadSupplierRisks(supplierName);
  if (!rows.length) throw new Error(`No data found for supplier: ${supplierName}`);

  const date         = opts.date || "March 2026";
  const baseline     = filterRisks(rows, { timeframe: "Baseline" });
  const restricted   = baseline.filter(r => r.risk_type.startsWith("Restricted") && r.risk_level === "Already happening");
  const socialHigh   = baseline.filter(r => SOCIAL_TYPES.some(t => r.risk_type.startsWith(t.split(" - ")[0]))
                                            && ["Very High","High"].includes(r.risk_level));
  const physCrit     = baseline.filter(r => PHYS_TYPES.includes(r.risk_type) && r.risk_level === "Critical");
  const facilities   = [...new Set(rows.map(r => r.facility_name))];

  const hrTable      = buildHRTable(rows);
  const climTable    = buildClimateTable(rows);
  const regTable     = buildRegTable();
  const alertsTable  = buildAlertsTable(rows);

  const topESG = [
    ...restricted,
    ...baseline.filter(r => SOCIAL_TYPES.some(t => r.risk_type.startsWith(t.split(" - ")[0]))
                             && r.risk_level === "Very High"),
    ...physCrit,
  ]
    .filter((r, i, arr) => arr.findIndex(x => x.facility_name === r.facility_name && x.risk_type === r.risk_type) === i)
    .sort((a, b) => (LEVEL_SCORE[b.risk_level] || 0) - (LEVEL_SCORE[a.risk_level] || 0))
    .slice(0, 5);

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
          subtitle: "ESG & Responsible Sourcing Risk Intelligence",
          role:     "Sustainability & Responsible Sourcing Briefing",
          date,
        }),

        B.h1("Executive Summary"),
        B.para([
          B.run(`This briefing presents ESG and responsible sourcing risk intelligence for `),
          B.run(supplierName, { bold: true }),
          B.run(`, drawing on 12 independent risk datasets spanning human rights, labour standards, restricted goods, physical climate risk, and water stewardship. The assessment covers ${facilities.length} ${facilities.length === 1 ? "facility" : "facilities"}.`),
        ]),
        B.para([
          B.run(`${restricted.length} ${restricted.length !== 1 ? "facilities carry" : "facility carries"} active restricted goods flags`),
          B.run(` placing supply chains in immediate scope of EU CSDDD, EU Forced Labour Regulation, and/or EUDR enforcement obligations. `),
          B.run(`${physCrit.length} facilities face Critical physical risk`),
          B.run(` requiring disclosure under CSRD and TCFD frameworks. The five priority actions below address the most material ESG compliance and reputational risks.`),
        ]),

        B.h1("Top 5 Priority ESG Actions"),
        B.para([B.run("Actions are ranked by regulatory immediacy and reputational exposure.", { italic: true })]),

        ...topESG.flatMap((r, i) => [
          B.h2(`${i + 1}. ${r.risk_type}: ${r.facility_name}`),
          B.para([
            B.run("Risk level: ", { bold: true }),
            B.run(r.risk_level, { bold: true, color: B.riskBadge(r.risk_level).color }),
          ]),
          r.context ? B.para(r.context) : B.para("See platform for full context and supporting data."),
          r.risk_type.includes("Restricted")
            ? B.bullet("Commission an independent social audit and establish a documented HRDD process as required under EU CSDDD.")
            : B.bullet("Engage the facility in a time-bound remediation plan covering identified risk dimensions."),
          B.bullet("Map all product lines from this facility destined for EU markets and assess regulatory scope."),
          B.bullet("Incorporate findings into the next CSRD/TCFD annual sustainability report disclosure."),
          B.emptyLine(120),
        ]),

        new (require("docx").Paragraph)({ children: [new PageBreak()] }),
        B.h1("Human Rights & Social Compliance Overview"),
        B.para("Social compliance risk profile for facilities with High or above worker rights, restricted goods, or modern slavery signals."),
        B.emptyLine(100),
        hrTable,
        B.emptyLine(200),

        B.h1("Regulatory Compliance Timeline"),
        B.para("Key regulatory milestones. Actions marked 'Now (in force)' require immediate implementation."),
        B.emptyLine(100),
        regTable,
        B.emptyLine(200),

        new (require("docx").Paragraph)({ children: [new PageBreak()] }),
        B.h1("Climate Risk Disclosure: TCFD / CSRD Mapping"),
        B.para("Facilities with physical risk levels crossing the threshold of financial materiality under CSRD double materiality and TCFD physical risk disclosure."),
        B.emptyLine(100),
        climTable,
        B.emptyLine(200),

        B.h1("Recommended Platform Monitoring Alerts"),
        B.para("Configure on the Earthena AI scheduling agent, calibrated to the ESG compliance calendar."),
        B.emptyLine(100),
        alertsTable,
        B.emptyLine(200),

        B.h1("Data Sources & Methodology"),
        B.para([
          B.run("Social risk datasets: ", { bold: true }),
          B.run("Child Labour (KnowTheChain + ILO sector risk); Modern Slavery (Global Slavery Index); Worker Rights (CSR Risk Check labour rights and remuneration indices); Restricted Goods (ILAB TVPRA List of Goods; EU CSDDD; EUDR; USMCA enforcement data)."),
        ]),
        B.para([
          B.run("Physical risk datasets: ", { bold: true }),
          B.run("Wildfire, Inland Flooding, Tropical Storm (UL Solutions models); Humidex Heat Stress (HX40+ days/year, SSP245 primary); Drought (CSIC SPEI-3); Waste Water (WRI Aqueduct); Landslide (susceptibility index); Coastal Flooding (return-period extents)."),
        ]),
        B.para([
          B.run("Regulatory references: ", { bold: true }),
          B.run("EU CSDDD 2024/1760; EU Forced Labour Regulation 2024/3015; EUDR 2023/1115; USMCA Chapter 23; ILO Conventions 29, 138, 182; CSRD (ESRS E1, E3, S1, S2); TCFD Recommendations 2017."),
        ]),
        B.para([B.run(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`, { italic: true, color: B.C.gray })]),

      ],
    }],
  });

  return Packer.toBuffer(doc);
}

module.exports = { generateSustainabilityReport };
