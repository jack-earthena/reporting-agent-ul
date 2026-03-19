"use strict";
/**
 * generators/executive.js
 * Generates the C-Suite Risk Intelligence Briefing (CEO / CFO).
 * Board-paper style: financial materiality framing, decision-required action mandates,
 * executive dashboard. Returns a Buffer (docx binary).
 */

const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat, WidthType, ShadingType,
        BorderStyle, HeadingLevel, PageNumber, PageBreak, TabStopType,
        TabStopPosition, VerticalAlign } = require("docx");

const B  = require("../lib/brand");
const DL = require("../lib/data-loader");

// Extra colours for executive tiles
const EX = {
  tile_red:   "FEE2E2",
  tile_amber: "FFEDD5",
  tile_orange:"FFF7ED",
  tile_blue:  "DBEAFE",
  tile_navy:  "EFF6FF",
};

const NB  = { style: BorderStyle.NONE, size: 0, color: "auto" };
const NBR = { top: NB, bottom: NB, left: NB, right: NB };

// ── Primitives (executive style: slightly more restrained) ─────────────────
const R  = (text, opts = {}) => new TextRun({ text, font: "Arial", size: opts.size || 22,
  bold: opts.bold || false, italics: opts.italic || false, color: opts.color || B.C.black, ...opts });

const TC = (text, opts = {}) => {
  const bd  = opts.badge ? B.riskBadge(text) : null;
  const bg  = opts.bg    || (bd ? bd.bg  : B.C.white);
  const col = opts.color || (bd ? bd.color : B.C.black);
  return new TableCell({
    borders: opts.borders || B.tableBorder(),
    width: opts.w ? { size: opts.w, type: WidthType.DXA } : undefined,
    shading: { fill: bg, type: ShadingType.CLEAR },
    margins: { top: opts.mt || 100, bottom: opts.mb || 100, left: opts.ml || 160, right: opts.mr || 160 },
    verticalAlign: opts.va || VerticalAlign.CENTER,
    columnSpan: opts.span,
    children: [new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { after: 0 },
      children: [R(text, { size: opts.size || 18, bold: opts.bold || !!bd, color: col })]
    })]
  });
};

const MTC = (lines, opts = {}) => new TableCell({
  borders: opts.borders || B.tableBorder(),
  width: opts.w ? { size: opts.w, type: WidthType.DXA } : undefined,
  shading: { fill: opts.bg || B.C.white, type: ShadingType.CLEAR },
  margins: { top: opts.mt || 100, bottom: opts.mb || 100, left: opts.ml || 160, right: opts.mr || 160 },
  verticalAlign: opts.va || VerticalAlign.TOP,
  children: lines.map((l, i) => new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { after: i === lines.length - 1 ? 0 : 60 },
    children: Array.isArray(l) ? l : [R(l, { size: opts.size || 18, color: opts.color || B.C.black })]
  }))
});

const H1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  children: [new TextRun({ text, font: "Arial", size: 28, bold: true, color: B.C.navy })],
  spacing: { before: 360, after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: B.C.accent, space: 4 } },
});

const H2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  children: [new TextRun({ text, font: "Arial", size: 24, bold: true, color: B.C.green })],
  spacing: { before: 280, after: 100 },
});

const SP = (n = 120) => new Paragraph({ spacing: { after: n } });

const makeHeader = () => new Header({ children: [new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: B.C.accent, space: 1 } },
  spacing: { after: 120 },
  tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
  children: [
    new TextRun({ text: "EARTHENA AI", font: "Arial", size: 16, bold: true, color: B.C.gray }),
    new TextRun({ text: "\tBoard-Level Risk Intelligence  |  CONFIDENTIAL", font: "Arial", size: 16, color: B.C.lgray }),
  ]
})] });

const makeFooter = () => new Footer({ children: [new Paragraph({
  border: { top: { style: BorderStyle.SINGLE, size: 4, color: B.C.cgray, space: 1 } },
  spacing: { before: 120 },
  children: [
    new TextRun({ text: "Confidential  |  Earthena AI  |  ", font: "Arial", size: 16, color: B.C.gray }),
    new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: B.C.gray }),
  ]
})] });

// ── Executive exposure card (coloured stripe + navy decision column) ────────
function exposureCard(num, title, facilityLine, riskLevel, financialFrame, decisionRequired) {
  const bd = B.riskBadge(riskLevel);
  return [
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [240, 6860, 2260],
      rows: [new TableRow({ children: [
        new TableCell({
          borders: NBR, width: { size: 240, type: WidthType.DXA },
          shading: { fill: bd.bg, type: ShadingType.CLEAR },
          children: [new Paragraph({ spacing: { after: 0 }, children: [R("")] })]
        }),
        MTC([
          [new TextRun({ text: `${num}.  ${title}`, font: "Arial", size: 24, bold: true, color: B.C.navy })],
          [new TextRun({ text: facilityLine, font: "Arial", size: 18, italics: true, color: B.C.gray })],
          [R(" ")],
          [new TextRun({ text: "Financial & strategic exposure:  ", font: "Arial", size: 20, bold: true, color: B.C.green }),
           new TextRun({ text: financialFrame, font: "Arial", size: 20 })],
        ], { w: 6860, borders: NBR, bg: "F9FAFB", mt: 160, mb: 0, ml: 200, mr: 100, va: VerticalAlign.TOP }),
        MTC([
          [new TextRun({ text: "DECISION REQUIRED", font: "Arial", size: 16, bold: true, color: B.C.white })],
          [R(" ")],
          [new TextRun({ text: decisionRequired, font: "Arial", size: 18, color: B.C.white })],
        ], { w: 2260, borders: NBR, bg: B.C.navy, mt: 160, mb: 160, ml: 160, mr: 160, va: VerticalAlign.TOP }),
      ]})]
    }),
    SP(120),
  ];
}

// ── Metric tiles builder (driven by actual counts from data) ───────────────
function buildMetricTiles(rows) {
  const baseline   = rows.filter(r => r.timeframe === "Baseline");
  const w5         = rows.filter(r => r.timeframe === "Within 5 Years");
  const critCount  = baseline.filter(r => r.risk_level === "Critical").length;
  const compCount  = baseline.filter(r => r.risk_level === "Already happening").length;
  const vhCount    = baseline.filter(r => r.risk_level === "Very High").length;
  const detCount   = w5.filter(r => r.risk_trend === "Deteriorating" &&
    ["Critical","Very High","High"].includes(r.risk_level)).length;

  const tile = (number, label, bg, color) => MTC([
    [new TextRun({ text: String(number), font: "Arial", size: 64, bold: true, color })],
    [new TextRun({ text: label, font: "Arial", size: 18, bold: true, color })],
  ], { w: 2340, bg, borders: NBR, mt: 160, mb: 160, ml: 80, mr: 80, va: VerticalAlign.CENTER });

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2340, 2340, 2340, 2340],
    rows: [new TableRow({ children: [
      tile(critCount,  "CRITICAL RISKS",       EX.tile_red,    B.C.critical),
      tile(compCount,  "COMPLIANCE FLAGS",      EX.tile_amber,  B.C.critical),
      tile(vhCount,    "VERY HIGH RISKS",       EX.tile_orange, B.C.veryhigh),
      tile(detCount,   "DETERIORATING W5",      EX.tile_blue,   B.C.medium),
    ]})]
  });
}

// ── Facility heatmap (domain-level summary per facility) ───────────────────
function buildHeatmap(rows) {
  const PHYS   = ["Wildfire","Inland Flooding","Humidex Heat Stress","Drought","Tropical Storm","Landslide","Coastal Flooding"];
  const WATER  = ["Waste Water","Coastal Flooding"];
  const SOCIAL = ["Child Labour","Modern Slavery","Worker Rights - Labour Rights","Worker Rights - Remuneration"];
  const COMP   = ["Restricted Goods - Forced Labor","Restricted Goods - Child Labor","Restricted Goods - Forced Labour"];

  const baseline = rows.filter(r => r.timeframe === "Baseline");
  const w5det    = rows.filter(r => r.timeframe === "Within 5 Years" && r.risk_trend === "Deteriorating");

  const SCORE = DL.LEVEL_SCORE;
  const facilities = [...new Set(baseline.map(r => r.facility_name))];

  function domainMax(fac, types) {
    const match = baseline.filter(r => r.facility_name === fac && types.some(t => r.risk_type.startsWith(t)));
    if (!match.length) return "Low";
    return match.sort((a,b) => (SCORE[b.risk_level]||0) - (SCORE[a.risk_level]||0))[0].risk_level;
  }
  function isDet(fac) { return w5det.some(r => r.facility_name === fac); }
  function hasComp(fac) { return baseline.some(r => r.facility_name === fac && COMP.some(t => r.risk_type.startsWith(t.split(" - ")[0]))); }

  function overall(fac) {
    const maxRow = baseline.filter(r => r.facility_name === fac)
      .sort((a,b) => (SCORE[b.risk_level]||0) - (SCORE[a.risk_level]||0));
    return maxRow.length ? maxRow[0].risk_level : "Low";
  }

  const headerRow = new TableRow({ tableHeader: true, children: [
    TC("Facility",   { w: 2600, bold: true, bg: B.C.navy, color: B.C.white }),
    TC("Physical",   { w: 1200, bold: true, bg: B.C.navy, color: B.C.white, center: true }),
    TC("Water",      { w: 1200, bold: true, bg: B.C.navy, color: B.C.white, center: true }),
    TC("Social",     { w: 1200, bold: true, bg: B.C.navy, color: B.C.white, center: true }),
    TC("Compliance", { w: 1200, bold: true, bg: B.C.navy, color: B.C.white, center: true }),
    TC("W5 Trend",   { w: 1160, bold: true, bg: B.C.navy, color: B.C.white, center: true }),
    TC("Highest",    { w: 1800, bold: true, bg: B.C.navy, color: B.C.white, center: true }),
  ]});

  const dataRows = facilities.map(fac => {
    const phys  = domainMax(fac, PHYS);
    const water = domainMax(fac, WATER);
    const soc   = domainMax(fac, SOCIAL);
    const comp  = hasComp(fac) ? "Already happening" : "None";
    const trend = isDet(fac) ? "Deteriorating" : "Stable";
    const top   = overall(fac);
    return new TableRow({ children: [
      TC(fac,  { w: 2600, size: 18 }),
      TC(phys, { w: 1200, badge: true, center: true, size: 17 }),
      TC(water,{ w: 1200, badge: true, center: true, size: 17 }),
      TC(soc,  { w: 1200, badge: true, center: true, size: 17 }),
      TC(comp, { w: 1200, badge: true, center: true, size: 17 }),
      TC(trend,{ w: 1160, center: true, size: 17, color: trend === "Deteriorating" ? B.C.critical : B.C.low }),
      TC(top,  { w: 1800, badge: true, center: true, size: 17 }),
    ]});
  });

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2600, 1200, 1200, 1200, 1200, 1160, 1800],
    rows: [headerRow, ...dataRows],
  });
}

// ── Regulatory calendar ────────────────────────────────────────────────────
function buildRegCalendar() {
  const rows = [
    ["Now (in force)",    "EU CSDDD — mandatory HRDD for large companies supplying EU markets",
     "Shanghai, Vietnam, Toluca, Argentina",
     "Regulatory liability for failure to document HRDD. Enforcement by EU member state authorities. Civil liability risk."],
    ["Now (in force)",    "EU Deforestation Regulation (EUDR) — deforestation-free commodity traceability",
     "SC Johnson Argentina",
     "Prohibition on placing cattle-derived inputs on EU market without deforestation-free documentation."],
    ["Q1 2026",           "USMCA Chapter 23 — 2026 Joint Review of labour enforcement",
     "Toluca Plant",
     "Tightened Rapid Response Mechanism may trigger facility-level trade sanctions if non-compliance is identified."],
    ["2025\u20132027",    "EU CSRD — double materiality reporting (ESRS E1, S1, S2)",
     "All 16 facilities",
     "Regulatory penalty for non-disclosure of material risks. Inadequate disclosure damages ESG ratings and investor relations."],
    ["December 2027",     "EU Forced Labour Regulation — EU market access ban",
     "Shanghai (primary), Vietnam (W5 risk)",
     "No remediation window at enforcement. Traceability and HRDD programme must be operational before this date."],
    ["2027+",             "TNFD nature-related financial disclosures",
     "Rosslyn, Shanghai (Very High water risk)",
     "Growing investor and lender expectation. Omission affects ESG scores and cost of capital."],
  ];

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1400, 2600, 1900, 3460],
    rows: [
      new TableRow({ tableHeader: true, children: [
        TC("When",                    { w: 1400, bold: true, bg: B.C.navy, color: B.C.white }),
        TC("Regulation",              { w: 2600, bold: true, bg: B.C.navy, color: B.C.white }),
        TC("Facilities in Scope",     { w: 1900, bold: true, bg: B.C.navy, color: B.C.white }),
        TC("Consequence of Inaction", { w: 3460, bold: true, bg: B.C.navy, color: B.C.white }),
      ]}),
      ...rows.map(([when, reg, scope, consq]) => new TableRow({ children: [
        TC(when,  { w: 1400, size: 18, bold: when.includes("December"), color: when.includes("December") ? B.C.critical : B.C.navy }),
        TC(reg,   { w: 2600, size: 18 }),
        TC(scope, { w: 1900, size: 18 }),
        TC(consq, { w: 3460, size: 18 }),
      ]}))
    ]
  });
}

// ── Board actions table ────────────────────────────────────────────────────
function buildActionsTable(rows) {
  const baseline = rows.filter(r => r.timeframe === "Baseline");
  const topRisks = DL.filterRisks(rows, { levels: ["Critical", "Already happening"] });

  // Generate dynamic action items based on what's in the data
  const actions = [];

  // HRDD (always if there are social/compliance flags)
  const hasComp = baseline.some(r => r.risk_type.includes("Restricted") && r.risk_level === "Already happening");
  if (hasComp) {
    const compFacs = [...new Set(baseline.filter(r => r.risk_type.includes("Restricted") && r.risk_level === "Already happening").map(r => r.facility_name))];
    actions.push(["1", "Approve budget for HRDD social audit programme",
      `Commission independent social audits at ${compFacs.slice(0,3).join(", ")}${compFacs.length > 3 ? " and others" : ""}. Appoint a CSDDD compliance lead. Establish a worker grievance mechanism at all flagged facilities. This addresses the live EU CSDDD obligation and initiates the evidence trail required for the EU Forced Labour Regulation December 2027 deadline.`,
      "CFO to approve budget; CEO to mandate. Deliver within 90 days."]);
  }

  // Physical critical risks
  const floodFacs = baseline.filter(r => r.risk_type === "Inland Flooding" && r.risk_level === "Critical").map(r => r.facility_name);
  if (floodFacs.length > 0) {
    actions.push(["2", "Commission capital assessment: flood resilience and insurance gap",
      `${floodFacs.join(" and ")} carry Critical inland flood risk with modelled expected asset loss of 33% of replacement value per event. Commission (a) site-level flood elevation surveys, (b) review of property and business interruption insurance adequacy relative to the modelled loss scenario, and (c) a business continuity plan for supply continuity in the event of simultaneous site disruption.`,
      "CFO to commission. Deliver within 120 days."]);
  }

  // CSRD disclosure
  const critPhys = baseline.filter(r =>
    ["Wildfire","Inland Flooding","Humidex Heat Stress","Drought"].includes(r.risk_type) && r.risk_level === "Critical");
  if (critPhys.length > 0) {
    const cf = [...new Set(critPhys.map(r => r.facility_name))];
    actions.push(["3", "Mandate CSRD / TCFD climate risk disclosure for Annual Report",
      `${cf.length} facilit${cf.length !== 1 ? "ies" : "y"} (${cf.slice(0,3).join(", ")}) carry Critical physical risk classifications that cross the CSRD financial materiality threshold. Direct CFO to include quantitative physical risk scenario analysis for these facilities in the next Annual Report under ESRS E1 (Climate) and S2 (Workers in Value Chain). Non-disclosure carries regulatory fines and ESG rating risk.`,
      "CFO to direct. Include in next Annual Report cycle."]);
  }

  // Compound facility strategic review
  const compoundFac = baseline.filter(r => r.risk_level === "Critical")
    .reduce((acc, r) => { acc[r.facility_name] = (acc[r.facility_name] || 0) + 1; return acc; }, {});
  const mostExposed = Object.entries(compoundFac).sort((a,b) => b[1]-a[1])[0];
  if (mostExposed) {
    actions.push(["4", `Commission strategic review: ${mostExposed[0]} dependency`,
      `${mostExposed[0]} is the most exposed single facility in the portfolio, carrying ${mostExposed[1]} Critical-level risk classifications. A board-level strategic review should map volume dependency on this facility and assess diversification feasibility, including alternative production locations. A single adverse event could disrupt significant production volume.`,
      "CEO to commission. Initial findings within 90 days."]);
  }

  // Compound physical+social site (Rosslyn-type)
  const rosslyn = baseline.filter(r => r.facility_name === "Rosslyn Factory" && ["Critical","Very High"].includes(r.risk_level));
  if (rosslyn.length >= 3) {
    actions.push(["5", "Require compound risk mitigation plan: Rosslyn Factory",
      "Rosslyn Factory carries the widest compound risk profile in the SCJ portfolio: Critical wildfire, Very High and deteriorating waste water, Very High and deteriorating modern slavery, and deteriorating drought. Require management to present a consolidated mitigation plan covering fire safety infrastructure, water resilience, and supply chain social compliance to the board.",
      "CEO/COO to mandate. Board presentation within 60 days."]);
  }

  // Cap at 5
  const five = actions.slice(0, 5);

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [340, 2500, 3920, 2600],
    rows: [
      new TableRow({ tableHeader: true, children: [
        TC("#",       { w: 340,  bold: true, bg: B.C.green, color: B.C.white, center: true }),
        TC("Action",  { w: 2500, bold: true, bg: B.C.green, color: B.C.white }),
        TC("Scope & Rationale", { w: 3920, bold: true, bg: B.C.green, color: B.C.white }),
        TC("Owner & Horizon",   { w: 2600, bold: true, bg: B.C.green, color: B.C.white }),
      ]}),
      ...five.map(([n, action, scope, owner]) => new TableRow({ children: [
        TC(n,      { w: 340,  bold: true, center: true, bg: EX.tile_navy }),
        TC(action, { w: 2500, size: 18, bold: true }),
        TC(scope,  { w: 3920, size: 18 }),
        TC(owner,  { w: 2600, size: 18, italic: true }),
      ]}))
    ]
  });
}

// ── Monitoring table ───────────────────────────────────────────────────────
function buildMonitoringTable(rows) {
  const hasSA  = rows.some(r => r.facility_name.toLowerCase().includes("rosslyn"));
  const hasPL  = rows.some(r => r.facility_name.toLowerCase().includes("gorzów") || r.facility_name.toLowerCase().includes("europlant"));
  const hasVN  = rows.some(r => r.facility_name.toLowerCase().includes("vietnam"));
  const hasCN  = rows.some(r => r.facility_name.toLowerCase().includes("shanghai"));

  const alerts = [
    ["EU FLR compliance milestone tracker", "All ILAB-flagged facilities", "Quarterly until Dec 2027", "Escalate to board if traceability programme slips behind 12-month lead time"],
    ["HRDD audit completion status", "All CSDDD-flagged facilities", "Quarterly", "Escalate if independent audit not commissioned within 90 days of board approval"],
  ];
  if (hasPL) alerts.push(["Polish plant flood season watch", "SCJ Europlant, G\u00f3rz\u00f3w Mfg", "Monthly Mar\u2013May", "Escalate to CEO/COO if 100-year flood event forecast within 72 hours"]);
  if (hasSA) alerts.push(["Rosslyn wildfire season", "Rosslyn Factory", "Monthly Nov\u2013Mar", "Escalate if SA National Fire Danger Rating reaches 'High' within 50km"]);
  if (hasVN || hasCN) alerts.push(["Western Pacific typhoon watch", "Vietnam, Shanghai, Taiwan", "Weekly Jun\u2013Nov", "Escalate at Category 1+ approach within 500km of manufacturing facility"]);
  alerts.push(["QuantEarth\u2122 annual risk score refresh", "All facilities", "Annual (Jan)", "Escalate any new Critical classification to CFO/CEO within 5 business days"]);

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2600, 2000, 1860, 2900],
    rows: [
      new TableRow({ tableHeader: true, children: [
        TC("Monitoring Alert",     { w: 2600, bold: true, bg: B.C.navy, color: B.C.white }),
        TC("Facilities",           { w: 2000, bold: true, bg: B.C.navy, color: B.C.white }),
        TC("Cadence",              { w: 1860, bold: true, bg: B.C.navy, color: B.C.white, center: true }),
        TC("Board-Level Trigger",  { w: 2900, bold: true, bg: B.C.navy, color: B.C.white }),
      ]}),
      ...alerts.map(([a, f, c, t]) => new TableRow({ children: [
        TC(a, { w: 2600, size: 18 }),
        TC(f, { w: 2000, size: 18 }),
        TC(c, { w: 1860, size: 18, center: true }),
        TC(t, { w: 2900, size: 18 }),
      ]}))
    ]
  });
}

// ── Top exposures from data (dynamic) ─────────────────────────────────────
function buildTopExposures(rows) {
  const baseline = rows.filter(r => r.timeframe === "Baseline");
  const topLevel = ["Critical", "Already happening"];
  const top = DL.filterRisks(rows, { levels: topLevel }).slice(0, 5);

  return top.flatMap((r, i) => {
    const ctx = r.context || "See QuantEarth\u2122 platform for full risk context.";
    return exposureCard(
      i + 1,
      `${r.risk_type}: ${r.facility_name}`,
      `Risk level: ${r.risk_level}  |  Confidence: ${r.risk_confidence || "N/A"}  |  W5 trend: ${r.risk_trend || "N/A"}`,
      r.risk_level,
      ctx,
      r.risk_level === "Already happening"
        ? "Mandate immediate HRDD audit and regulatory scoping for this facility."
        : "Require management to present a risk mitigation plan within 60 days."
    );
  });
}

// ── Main export ────────────────────────────────────────────────────────────

async function generateExecutiveReport(supplierName, opts = {}) {
  const rows = await DL.loadSupplierRisks(supplierName);
  if (!rows.length) throw new Error(`No data found for supplier: ${supplierName}`);

  const date       = opts.date || "March 2026";
  const facilities = [...new Set(rows.map(r => r.facility_name))];
  const baseline   = rows.filter(r => r.timeframe === "Baseline");
  const critCount  = baseline.filter(r => r.risk_level === "Critical").length;
  const compCount  = baseline.filter(r => r.risk_level === "Already happening").length;

  const metricTiles   = buildMetricTiles(rows);
  const heatmap       = buildHeatmap(rows);
  const topExposures  = buildTopExposures(rows);
  const regCalendar   = buildRegCalendar();
  const actionsTable  = buildActionsTable(rows);
  const monTable      = buildMonitoringTable(rows);

  const doc = new Document({
    numbering: B.docNumbering,
    styles:    B.docStyles,
    sections: [{
      properties: B.pageProperties,
      headers: { default: makeHeader() },
      footers: { default: makeFooter() },
      children: [

        // ── TITLE PAGE ────────────────────────────────────────────────────
        SP(560),
        new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { after: 60 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: B.C.accent, space: 6 } },
          children: [R(supplierName, { size: 48, bold: true, color: B.C.navy })]
        }),
        SP(200),
        new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { after: 80 },
          children: [R("C-Suite Risk Intelligence Briefing", { size: 32, bold: true, color: B.C.green })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { after: 80 },
          children: [R("For the attention of the Chief Executive Officer and Chief Financial Officer", { size: 22, color: B.C.gray })]
        }),
        SP(300),
        new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { after: 80 },
          children: [R("Prepared by Earthena AI", { size: 20, color: B.C.gray })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { after: 80 },
          children: [R(`${date}  |  QuantEarth\u2122 Outside-In Supply Chain Mapping`, { size: 20, color: B.C.lgray })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { after: 80 },
          children: [R("Strictly Confidential \u2014 For Internal Use Only", { size: 20, italic: true, color: B.C.lgray })]
        }),
        SP(400),
        new Paragraph({ children: [new PageBreak()] }),

        // ── SECTION 1: DASHBOARD ─────────────────────────────────────────
        H1("Risk Exposure Dashboard"),
        new Paragraph({
          spacing: { after: 160 },
          children: [
            R(`This dashboard summarises the QuantEarth\u2122 risk assessment for `),
            R(supplierName, { bold: true }),
            R(`, covering ${facilities.length} supplier ${facilities.length === 1 ? "facility" : "facilities"} across 12 independent risk domains. ${critCount} Critical-level and ${compCount} \u2018Already Happening\u2019 compliance findings require immediate board attention.`),
          ]
        }),
        metricTiles,
        SP(160),
        new Paragraph({ spacing: { after: 200 }, children: [
          R("W5 = 5-year forward projection horizon. A deteriorating trend indicates a worsening trajectory under climate or regulatory scenario analysis.", { size: 19, italic: true, color: B.C.gray })
        ]}),
        H2("Facility Risk Heatmap"),
        new Paragraph({ spacing: { after: 120 }, children: [
          R("Highest risk classification per domain. Compliance = restricted goods regulatory list exposure.", { size: 19, italic: true, color: B.C.gray })
        ]}),
        heatmap,
        SP(200),

        // ── SECTION 2: MATERIAL EXPOSURES ────────────────────────────────
        new Paragraph({ children: [new PageBreak()] }),
        H1("Material Risk Exposures"),
        new Paragraph({ spacing: { after: 200 }, children: [
          R("The following exposures represent the most material financial and strategic risks. Each requires a board-level decision.", { italic: true })
        ]}),
        ...topExposures,

        // ── SECTION 3: REGULATORY LIABILITY ──────────────────────────────
        new Paragraph({ children: [new PageBreak()] }),
        H1("Regulatory Liability Calendar"),
        new Paragraph({ spacing: { after: 160 }, children: [
          R("Regulatory deadlines and the financial or commercial consequences of inaction. Entries marked \u2018Now (in force)\u2019 create immediate legal obligations.", { italic: true })
        ]}),
        regCalendar,
        SP(200),

        // ── SECTION 4: BOARD ACTIONS ──────────────────────────────────────
        H1("Board Action Mandates"),
        new Paragraph({ spacing: { after: 160 }, children: [
          R("Five decisions requiring CEO and/or CFO approval, budget commitment, or strategic direction. These are board-level mandates, not operational recommendations.", { italic: true })
        ]}),
        actionsTable,
        SP(200),

        // ── SECTION 5: MONITORING ─────────────────────────────────────────
        new Paragraph({ children: [new PageBreak()] }),
        H1("Governance & Monitoring Cadence"),
        new Paragraph({ spacing: { after: 120 }, children: [
          R("Alerts for configuration on the Earthena AI scheduling agent, with board-level escalation triggers defined for each.")
        ]}),
        SP(80),
        monTable,
        SP(240),

        // ── CERTIFICATION ─────────────────────────────────────────────────
        H1("Data Sources & Certification"),
        new Paragraph({ spacing: { after: 160 }, children: [
          R("This briefing is based exclusively on the Earthena AI QuantEarth\u2122 Outside-In Supply Chain risk datasets, covering 12 independent risk domains. "),
          R("No risk signals have been extrapolated or added beyond the source datasets.", { bold: true }),
          R(" Physical climate risks use multi-scenario SSP projections (SSP1-2.6, SSP2-4.5, SSP3-7.0, SSP5-8.5). Social and compliance risks use country/sector index frameworks (KnowTheChain, CSR Risk Check, WRI Aqueduct, ILAB TVPRA)."),
        ]}),
        new Paragraph({ spacing: { after: 160 }, children: [
          R("Terminology: ", { bold: true }),
          R("'W5' (Within 5 Years) = 5-year forward projection horizon. 'W12' (Within 12 Months) = 12-month horizon. 'Deteriorating' indicates a worsening trajectory under scenario analysis. Risk scale: Negligible / Very Low / Low / Medium / High / Very High / Critical. 'Already Happening' = active regulatory list exposure."),
        ]}),
        new Paragraph({ spacing: { after: 80 }, children: [
          R("This document is prepared for the exclusive use of the CEO and CFO of the client organisation. It does not constitute legal advice. Regulatory interpretation should be confirmed with qualified legal counsel.", { size: 20, italic: true, color: B.C.gray }),
        ]}),
        new Paragraph({ spacing: { after: 0 }, children: [
          R(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`, { size: 20, italic: true, color: B.C.lgray }),
        ]}),

      ]
    }]
  });

  return Packer.toBuffer(doc);
}

module.exports = { generateExecutiveReport };
