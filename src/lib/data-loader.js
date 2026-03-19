"use strict";
/**
 * data-loader.js
 * Reads the data_files *_new_*.csv files and returns structured risk data for a supplier.
 * Supports Baseline, Within 12 Months, Within 5 Years timeframes; results are cached in-process for 1 hour.
 */

const fs   = require("fs").promises;
const path = require("path");
const { parse } = require("csv-parse/sync");

// ── Config ─────────────────────────────────────────────────────────────────
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, "./data");

const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS || 3_600_000); // 1 hour

// Risk types the generators expect (exclude electricity_price, grid_mix, water_shortage)
const EXPECTED_RISK_TYPES = new Set([
  "child_labour", "coastal_flooding", "drought", "humidex", "inland_flooding",
  "landslides", "modern_slavery", "restricted_goods", "tropical_storm",
  "waste_water", "wildfire", "worker_rights",
]);

const SUFFIXES = ["_new_Baseline.csv", "_new_Within 12 Months.csv", "_new_Within 5 Years.csv"];

// ── Risk level ordering (for scoring/sorting) ──────────────────────────────
const LEVEL_SCORE = {
  "Negligible": 0,
  "Very Low":   1,
  "Low":        2,
  "Medium":     3,
  "High":       4,
  "Very High":  5,
  "Critical":   6,
  "Already happening": 7,
};
exports.LEVEL_SCORE = LEVEL_SCORE;

// ── In-process cache ───────────────────────────────────────────────────────
const _cache = new Map(); // key -> { data, ts }

function _cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { _cache.delete(key); return null; }
  return entry.data;
}
function _cacheSet(key, data) {
  _cache.set(key, { data, ts: Date.now() });
}

// ── Slugify (for deduplicating supplier names) ─────────────────────────────
function slugify(input) {
  return (input || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── File discovery ────────────────────────────────────────────────────────
let _riskFileMap = null; // { riskType: [absolutePath, ...] }

async function _getRiskFileMap() {
  if (_riskFileMap) return _riskFileMap;
  let entries;
  try {
    entries = await fs.readdir(DATA_DIR);
  } catch {
    _riskFileMap = {};
    return _riskFileMap;
  }
  const map = {};
  for (const fn of entries) {
    if (!fn.endsWith(".csv") || !fn.includes("_new_")) continue;
    for (const suffix of SUFFIXES) {
      if (fn.endsWith(suffix)) {
        const riskType = fn.slice(0, -suffix.length);
        if (EXPECTED_RISK_TYPES.has(riskType)) {
          if (!map[riskType]) map[riskType] = [];
          map[riskType].push(path.join(DATA_DIR, fn));
        }
        break;
      }
    }
  }
  _riskFileMap = map;
  return map;
}

// ── CSV helpers ────────────────────────────────────────────────────────────
/**
 * Returns a "context" string for a row regardless of whether it uses the
 * new `context` column or the legacy `risk_factor_N` columns.
 */
function extractContext(row) {
  if (row.context !== undefined) return row.context || "";
  // Legacy: concatenate non-empty risk_factor_N values
  const parts = [];
  for (let i = 1; i <= 15; i++) {
    const v = row[`risk_factor_${i}`];
    if (v && v.trim()) parts.push(v.trim());
  }
  return parts.join(" | ");
}

/**
 * Normalize a row to the expected shape. Handles optional risk_confidence/risk_trend.
 */
function normalizeRow(r) {
  return {
    supplier_name:   r.supplier_name,
    facility_name:   r.facility_name,
    risk_type:       r.risk_type,
    risk_level:      r.risk_level,
    risk_confidence: r.risk_confidence ?? "",
    risk_trend:      r.risk_trend ?? "",
    timeframe:       r.timeframe,
    context:         extractContext(r),
  };
}

/**
 * Parse one CSV file and return all rows for a given supplier.
 * @param {string} filePath  absolute path to CSV
 * @param {string} supplier  exact supplier_name to filter on
 */
async function _parseFile(filePath, supplier) {
  let raw;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch {
    return []; // file missing — skip silently
  }
  const rows = parse(raw, { columns: true, skip_empty_lines: true, bom: true });
  const targetSlug = slugify(supplier);
  return rows
    .filter(r => slugify(r.supplier_name) === targetSlug)
    .map(r => normalizeRow(r));
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Load all risk rows for one supplier, across all risk-type CSV files.
 * Returns a flat array of risk row objects.
 */
async function loadSupplierRisks(supplierName) {
  const cacheKey = `risks:${supplierName}`;
  const cached = _cacheGet(cacheKey);
  if (cached) return cached;

  const fileMap = await _getRiskFileMap();
  const allPaths = Object.values(fileMap).flat();
  const promises = allPaths.map(p => _parseFile(p, supplierName));
  const arrays = await Promise.all(promises);
  const data = arrays.flat();
  _cacheSet(cacheKey, data);
  return data;
}
exports.loadSupplierRisks = loadSupplierRisks;

/**
 * Return the list of unique supplier names across all CSV files.
 * Deduplicates by slug (e.g. "GOJO Industries Inc." and "GOJO Industries, Inc." -> one entry).
 * Prefers canonical names from locations.csv when available.
 */
async function listSuppliers() {
  const cacheKey = "suppliers:all";
  const cached = _cacheGet(cacheKey);
  if (cached) return cached;

  const slugToName = new Map(); // slug -> canonical supplier name

  // 1. Load canonical names from locations.csv first
  const locationsPath = path.join(DATA_DIR, "locations.csv");
  try {
    const raw = await fs.readFile(locationsPath, "utf-8");
    const rows = parse(raw, { columns: true, skip_empty_lines: true, bom: true });
    for (const r of rows) {
      const name = (r.supplier_name || "").trim();
      if (name) {
        const slug = slugify(name);
        if (!slugToName.has(slug)) slugToName.set(slug, name);
      }
    }
  } catch {
    // locations.csv missing — continue with risk files only
  }

  // 2. Add any suppliers from risk files not yet in map
  const fileMap = await _getRiskFileMap();
  const allPaths = Object.values(fileMap).flat();
  for (const filePath of allPaths) {
    let raw;
    try { raw = await fs.readFile(filePath, "utf-8"); } catch { continue; }
    const rows = parse(raw, { columns: true, skip_empty_lines: true, bom: true });
    for (const r of rows) {
      const name = (r.supplier_name || "").trim();
      if (name) {
        const slug = slugify(name);
        if (!slugToName.has(slug)) slugToName.set(slug, name);
      }
    }
  }

  const data = Array.from(slugToName.values()).sort();
  _cacheSet(cacheKey, data);
  return data;
}
exports.listSuppliers = listSuppliers;

/**
 * Return a summary JSON for a supplier:
 * { supplier, totalFacilities, criticalCount, risks: [baseline rows sorted by level] }
 */
async function getSupplierSummary(supplierName) {
  const all = await loadSupplierRisks(supplierName);
  if (!all.length) return null;

  const baseline = all.filter(r => r.timeframe === "Baseline");
  const facilities = [...new Set(baseline.map(r => r.facility_name))];
  const criticals  = baseline.filter(r => r.risk_level === "Critical" || r.risk_level === "Already happening");

  const sorted = [...baseline].sort(
    (a, b) => (LEVEL_SCORE[b.risk_level] || 0) - (LEVEL_SCORE[a.risk_level] || 0)
  );

  return {
    supplier:        supplierName,
    totalFacilities: facilities.length,
    facilities,
    criticalCount:   criticals.length,
    risks:           sorted,
  };
}
exports.getSupplierSummary = getSupplierSummary;

/**
 * Convenience: get baseline rows filtered by level(s) and optionally facility.
 */
function filterRisks(rows, { levels, timeframe = "Baseline", facility } = {}) {
  return rows.filter(r => {
    if (timeframe && r.timeframe !== timeframe) return false;
    if (levels && !levels.includes(r.risk_level)) return false;
    if (facility && r.facility_name !== facility) return false;
    return true;
  }).sort((a, b) => (LEVEL_SCORE[b.risk_level] || 0) - (LEVEL_SCORE[a.risk_level] || 0));
}
exports.filterRisks = filterRisks;

/** Invalidate cache for one supplier (or all if no argument). */
function clearCache(supplierName) {
  if (supplierName) {
    _cache.delete(`risks:${supplierName}`);
    _cache.delete(`suppliers:all`);
  } else {
    _cache.clear();
  }
}
exports.clearCache = clearCache;
