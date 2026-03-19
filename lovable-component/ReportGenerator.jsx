/**
 * ReportGenerator.jsx
 * Drop this component anywhere in your Lovable project.
 *
 * What it does:
 *   1. Loads the list of suppliers from the reporting-agent API on mount.
 *   2. Lets the user pick a supplier and a report type.
 *   3. Calls POST /api/report and triggers a .docx browser download.
 *
 * Setup:
 *   - Set VITE_REPORT_API_URL in your Lovable project's environment variables
 *     (e.g. https://your-reporting-agent.railway.app)
 *   - Drop <ReportGenerator /> anywhere in your page/dashboard.
 */

import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_REPORT_API_URL || "http://localhost:8080";

const REPORT_TYPES = [
  { value: "sourcing",       label: "Sourcing Manager",        description: "Restricted goods, compliance, supply disruption" },
  { value: "operations",     label: "Operations Manager",       description: "Physical risk, BCP, asset protection" },
  { value: "sustainability", label: "Sustainability / ESG",     description: "Human rights, CSRD/TCFD, climate disclosure" },
  { value: "executive",      label: "C-Suite / Board Briefing", description: "CEO & CFO: financial materiality, board action mandates" },
];

export default function ReportGenerator() {
  const [suppliers, setSuppliers]   = useState([]);
  const [selected,  setSelected]    = useState("");
  const [type,      setType]        = useState("sourcing");
  const [loading,   setLoading]     = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [error,     setError]       = useState(null);
  const [success,   setSuccess]     = useState(null);

  // Load supplier list on mount
  useEffect(() => {
    fetch(`${API_URL}/api/suppliers`)
      .then(r => r.json())
      .then(data => {
        setSuppliers(data.suppliers || []);
        setLoadingSuppliers(false);
      })
      .catch(err => {
        setError("Could not load supplier list. Check that the reporting agent is running.");
        setLoadingSuppliers(false);
      });
  }, []);

  const handleGenerate = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/report`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ supplier: selected, type }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const { docx: docxBase64 } = await response.json();
      const docxBytes = Uint8Array.from(atob(docxBase64), c => c.charCodeAt(0));
      const blob = new Blob([docxBytes], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = selected.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
      link.href = url;
      link.download = `${safeName}_${type}_report.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess(`${REPORT_TYPES.find(t => t.value === type)?.label} report downloaded.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-xl">
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-gray-900">Generate Risk Report</h2>
        <p className="text-sm text-gray-500 mt-1">
          QuantEarth&#8482; Outside-In Supply Chain Intelligence &mdash; Earthena AI
        </p>
      </div>

      {/* Error / success banners */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Supplier selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Supplier
        </label>
        {loadingSuppliers ? (
          <div className="h-10 bg-gray-100 rounded animate-pulse" />
        ) : (
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Select a supplier...</option>
            {suppliers.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      {/* Report type selector */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Report type
        </label>
        <div className="grid grid-cols-1 gap-2">
          {REPORT_TYPES.map(rt => (
            <label
              key={rt.value}
              className={`flex items-start gap-3 rounded-md border px-4 py-3 cursor-pointer transition-colors
                ${type === rt.value
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-gray-200 hover:border-gray-300"}`}
            >
              <input
                type="radio"
                name="reportType"
                value={rt.value}
                checked={type === rt.value}
                onChange={() => setType(rt.value)}
                className="mt-0.5 accent-emerald-600"
              />
              <span>
                <span className="block text-sm font-medium text-gray-800">{rt.label}</span>
                <span className="block text-xs text-gray-500">{rt.description}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={!selected || loading}
        className={`w-full rounded-md px-4 py-2.5 text-sm font-semibold transition-colors
          ${!selected || loading
            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
            : "bg-emerald-700 text-white hover:bg-emerald-800 active:bg-emerald-900"}`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Generating report...
          </span>
        ) : "Generate Report"}
      </button>

      <p className="mt-3 text-xs text-gray-400 text-center">
        Report delivered as a .docx file. Generation typically takes 3-8 seconds.
      </p>
    </div>
  );
}
