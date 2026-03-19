"use strict";
/**
 * brand.js — Earthena AI shared docx styling helpers
 * All colour constants, shared paragraph/heading/table-cell constructors.
 * Import this in every generator; never duplicate these definitions.
 */

const {
  Paragraph, TextRun, TableCell, Header, Footer,
  AlignmentType, WidthType, ShadingType, BorderStyle,
  HeadingLevel, PageNumber, TabStopType, TabStopPosition,
  VerticalAlign,
} = require("docx");

// ── Colour palette ─────────────────────────────────────────────────────────
const C = {
  // Brand
  navy:    "1A2E44",
  green:   "2E6B4F",
  accent:  "4A9B6F",
  // Grays
  gray:    "999999",
  lgray:   "BBBBBB",
  cgray:   "CCCCCC",
  // Text
  white:   "FFFFFF",
  black:   "000000",
  // Risk level colours
  critical:"B91C1C",
  veryhigh:"C2410C",
  high:    "B45309",
  medium:  "1E40AF",
  low:     "15803D",
  vlow:    "4B5563",
  neg:     "9CA3AF",
};
exports.C = C;

// ── Risk badge mapping ─────────────────────────────────────────────────────
const RISK_BADGE = {
  "Critical":          { color: C.critical,  bg: "FEE2E2" },
  "Very High":         { color: C.veryhigh,  bg: "FFEDD5" },
  "High":              { color: C.high,      bg: "FEF3C7" },
  "Medium":            { color: C.medium,    bg: "DBEAFE" },
  "Low":               { color: C.low,       bg: "DCFCE7" },
  "Very Low":          { color: C.vlow,      bg: "F3F4F6" },
  "Negligible":        { color: C.neg,       bg: "F9FAFB" },
  "Already happening": { color: C.critical,  bg: "FEE2E2" },
};
exports.riskBadge = (level) => RISK_BADGE[level] || { color: C.black, bg: C.white };

// ── Border helpers ─────────────────────────────────────────────────────────
const THIN = (col = C.cgray) => ({ style: BorderStyle.SINGLE, size: 1, color: col });
exports.tableBorder = (col) => {
  const b = THIN(col);
  return { top: b, bottom: b, left: b, right: b };
};

// ── Text run ───────────────────────────────────────────────────────────────
exports.run = (text, opts = {}) =>
  new TextRun({
    text,
    font:    "Arial",
    size:    opts.size    || 22,
    bold:    opts.bold    || false,
    italics: opts.italic  || false,
    color:   opts.color   || C.black,
    ...opts,
  });

// ── Paragraphs ─────────────────────────────────────────────────────────────
exports.para = (children, opts = {}) => {
  if (typeof children === "string") children = [exports.run(children)];
  return new Paragraph({
    children,
    spacing: {
      after:  opts.spaceAfter  !== undefined ? opts.spaceAfter  : 160,
      before: opts.spaceBefore !== undefined ? opts.spaceBefore : 0,
    },
    alignment: opts.align || AlignmentType.LEFT,
    ...opts,
  });
};

exports.h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, font: "Arial", size: 28, bold: true, color: C.navy })],
    spacing: { before: 360, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.accent, space: 4 } },
  });

exports.h2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, font: "Arial", size: 24, bold: true, color: C.green })],
    spacing: { before: 280, after: 120 },
  });

exports.h3 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, font: "Arial", size: 22, bold: true, color: C.navy })],
    spacing: { before: 200, after: 80 },
  });

exports.bullet = (text) =>
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children:  [exports.run(text, { size: 22 })],
    spacing:   { after: 100 },
  });

exports.emptyLine = (space = 120) => new Paragraph({ spacing: { after: space } });

// ── Table cell ─────────────────────────────────────────────────────────────
exports.tc = (text, opts = {}) => {
  const border = exports.tableBorder();
  const badge  = opts.badge ? exports.riskBadge(text) : null;
  const bg     = opts.bg        || (badge ? badge.bg    : C.white);
  const clr    = opts.textColor || (badge ? badge.color : C.black);
  return new TableCell({
    borders:       border,
    width:         opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading:       { fill: bg, type: ShadingType.CLEAR },
    margins:       { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { after: 0 },
        children: [
          new TextRun({
            text,
            font:  "Arial",
            size:  opts.size || 18,
            bold:  opts.bold || !!badge,
            color: clr,
          }),
        ],
      }),
    ],
  });
};

// ── Header / Footer ────────────────────────────────────────────────────────
exports.makeHeader = () =>
  new Header({
    children: [
      new Paragraph({
        border:    { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.accent, space: 1 } },
        spacing:   { after: 120 },
        tabStops:  [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: [
          new TextRun({ text: "EARTHENA AI", font: "Arial", size: 16, bold: true, color: C.gray }),
          new TextRun({ text: "\tConfidential Supply Chain Intelligence", font: "Arial", size: 16, color: C.lgray }),
        ],
      }),
    ],
  });

exports.makeFooter = () =>
  new Footer({
    children: [
      new Paragraph({
        border:  { top: { style: BorderStyle.SINGLE, size: 4, color: C.cgray, space: 1 } },
        spacing: { before: 120 },
        children: [
          new TextRun({ text: "Confidential  |  Earthena AI  |  ", font: "Arial", size: 16, color: C.gray }),
          new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: C.gray }),
        ],
      }),
    ],
  });

// ── Title block ────────────────────────────────────────────────────────────
/**
 * Returns the paragraphs that form a standard title page block.
 * @param {object} opts
 * @param {string} opts.supplier       e.g. "S.C. Johnson & Son, Inc."
 * @param {string} opts.subtitle       e.g. "Supply Chain Risk Intelligence"
 * @param {string} opts.role           e.g. "Sourcing Manager Briefing"
 * @param {string} opts.date           e.g. "March 2026"
 */
exports.titlePage = ({ supplier, subtitle, role, date = "March 2026" }) => {
  const { PageBreak } = require("docx");
  return [
    exports.emptyLine(480),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: supplier, font: "Arial", size: 44, bold: true, color: C.navy })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: subtitle, font: "Arial", size: 30, color: C.green })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: role, font: "Arial", size: 26, bold: true, color: C.gray })],
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.accent, space: 4 } },
      spacing: { after: 300 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: "Prepared by Earthena AI", font: "Arial", size: 20, color: C.gray })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: `${date}  |  QuantEarth\u2122 Outside-In Supply Chain Mapping`, font: "Arial", size: 20, color: C.lgray })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: "Confidential Draft", font: "Arial", size: 20, italics: true, color: C.lgray })],
    }),
    exports.emptyLine(600),
    new Paragraph({ children: [new PageBreak()] }),
  ];
};

// ── Shared document numbering + styles config ──────────────────────────────
exports.docNumbering = {
  config: [
    {
      reference: "bullets",
      levels: [{
        level: 0, format: "bullet", text: "\u2022", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    },
    {
      reference: "numbers",
      levels: [{
        level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    },
  ],
};

exports.docStyles = {
  default: { document: { run: { font: "Arial", size: 22 } } },
  paragraphStyles: [
    { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 28, bold: true, font: "Arial", color: C.navy },
      paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
    { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 24, bold: true, font: "Arial", color: C.green },
      paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
    { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 22, bold: true, font: "Arial", color: C.navy },
      paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
  ],
};

exports.pageProperties = {
  page: {
    size: { width: 12240, height: 15840 },
    margin: { top: 1080, right: 1260, bottom: 1080, left: 1260 },
  },
};
