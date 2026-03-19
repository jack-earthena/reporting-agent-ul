# Earthena AI — Reporting Agent

Express.js API that generates QuantEarth™ supply chain risk reports (.docx) on demand. Accepts a supplier name and report type, reads the `for_gcp` CSV data, and returns a formatted Word document plus PDF preview (when LibreOffice is available).

---

## Prerequisites

**LibreOffice** is required for PDF preview in the web app. Without it, reports still generate and download as .docx, but the inline PDF viewer will fall back to an alternative preview.

- **macOS:** `brew install libreoffice`
- **Linux (Debian/Ubuntu):** `apt install libreoffice`
- **Linux (RHEL/CentOS):** `yum install libreoffice`

---

## Folder structure

```
reporting_agent/
├── src/
│   ├── index.js                    Express server entry point
│   ├── lib/
│   │   ├── brand.js                Shared Earthena AI docx styles/helpers
│   │   └── data-loader.js          CSV parsing + in-process cache
│   ├── generators/
│   │   ├── index.js                Dispatcher: generateReport(supplier, type)
│   │   ├── sourcing.js             Sourcing Manager report
│   │   ├── operations.js           Operations Manager report
│   │   └── sustainability.js       ESG & Responsible Sourcing report
│   ├── routes/
│   │   ├── suppliers.js            GET /api/suppliers[/:name/summary]
│   │   └── report.js               POST /api/report
│   └── middleware/
│       ├── validation.js           Request body validation
│       └── error-handler.js        Centralised error responses
├── lovable-component/
│   └── ReportGenerator.jsx         Drop-in React component for Lovable
├── .env.example
├── Dockerfile
└── package.json
```

---

## Quick start (local)

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment
cp .env.example .env
# Edit .env: set DATA_DIR to your for_gcp folder path

# 3. Start server
npm start           # production
npm run dev         # development (auto-reload via nodemon)
```

---

## Environment variables

| Variable          | Default                      | Description |
|-------------------|------------------------------|-------------|
| `PORT`            | `3081`                       | Port to listen on |
| `DATA_DIR`        | `../data_files` (from agent) | Path to folder containing `*_new_*.csv` and `locations.csv` |
| `ALLOWED_ORIGINS` | (hardcoded) | localhost:3000, 5173, 8080 + Lovable app |
| `RATE_LIMIT`      | `20`                         | Max report requests per IP per minute |
| `CACHE_TTL_MS`    | `3600000`                    | CSV cache TTL in milliseconds (default 1 hour) |

---

## API reference

### `GET /health`
Returns `{ status: "ok", timestamp: "..." }`. Use as your load-balancer health check.

### `GET /api/suppliers`
Returns the list of supplier names present in the CSV data.
```json
{ "suppliers": ["S.C. Johnson & Son, Inc.", "Techtronic Industries", "..."] }
```

### `GET /api/suppliers/:name/summary`
Returns a risk summary JSON for one supplier.
```json
{
  "supplier": "S.C. Johnson & Son, Inc.",
  "totalFacilities": 17,
  "criticalCount": 4,
  "facilities": ["Rosslyn Factory", "..."],
  "risks": [{ "facility_name": "...", "risk_type": "...", "risk_level": "Critical", ... }]
}
```

### `POST /api/report`
Generates a report and returns both .docx and PDF (when LibreOffice is installed) as base64-encoded JSON.

**Request body:**
```json
{
  "supplier": "S.C. Johnson & Son, Inc.",
  "type": "sourcing",
  "date": "March 2026"
}
```

| Field      | Required | Values |
|------------|----------|--------|
| `supplier` | Yes      | Exact string matching `supplier_name` in the CSVs |
| `type`     | Yes      | `"sourcing"`, `"operations"`, `"sustainability"`, or `"executive"` |
| `date`     | No       | Date string shown on the title page (default: `"March 2026"`) |

**Response:** JSON with base64-encoded documents:
```json
{
  "docx": "<base64-encoded-docx>",
  "pdf": "<base64-encoded-pdf>"
}
```

`pdf` is `null` if LibreOffice conversion fails (e.g. LibreOffice not installed). The frontend uses `docx` for download and `pdf` for inline preview.

---

## Lovable integration

1. Copy `lovable-component/ReportGenerator.jsx` into your Lovable project's `src/components/` folder.

2. Add your API URL as an environment variable in Lovable:
   ```
   VITE_REPORT_API_URL=https://your-reporting-agent.railway.app
   ```

3. Drop the component onto any page:
   ```jsx
   import ReportGenerator from "@/components/ReportGenerator";

   export default function Dashboard() {
     return (
       <div className="p-8">
         <ReportGenerator />
       </div>
     );
   }
   ```

The component:
- Loads the supplier list automatically on mount.
- Shows radio buttons for report type (Sourcing, Operations, Sustainability).
- Calls `POST /api/report` and triggers a browser file download.
- Shows loading spinners and error/success states.

---

## Deployment (Lovable + Railway/Render)

The frontend deploys on Lovable when you push to GitHub. The reporting agent must be deployed separately.

### 1. Deploy reporting agent (Railway or Render)

**Railway** (recommended):

1. Go to [railway.app](https://railway.app), create a project, connect your GitHub repo.
2. Add a new service. Railway will use the `Dockerfile` (bundles `data`, `src`, and LibreOffice for PDF conversion).
3. Environment variables are optional; CORS origins are fixed (localhost + Lovable).
4. Deploy. Copy the public URL (e.g. `https://your-service.railway.app`).

**Render**:

1. Go to [render.com](https://render.com), create a Web Service from your GitHub repo.
2. Use the `render.yaml` blueprint, or manually set:
   - **Runtime:** Docker
   - **Dockerfile path:** `./Dockerfile.reporting`
3. Deploy. Copy the public URL.

### 2. Configure Lovable

1. In Lovable, open your project settings.
2. Add environment variable:
   - **Name:** `VITE_REPORT_API_URL`
   - **Value:** Your reporting agent URL (e.g. `https://your-service.up.railway.app`)
3. Redeploy the frontend.

**Lovable app:** `https://5a62631f-7f03-4dd4-97d6-f5f00fac202e.lovableproject.com` — this origin is allowed.

### 3. Verify

- The Reporting page should load the supplier list.
- Generating a report should download the .docx and show the PDF preview (if LibreOffice is available).

### Docker (local or self-hosted)

```bash
# From repo root — bundles data_files and LibreOffice
docker build -f Dockerfile.reporting -t reporting-agent .
docker run -p 3081:3081 \
  reporting-agent
```

### Volume-only build (no bundled data)

Use `reporting_agent/Dockerfile` when building from the `reporting_agent` directory:

```bash
cd reporting_agent
docker build -t reporting-agent .
docker run -p 3081:3081 \
  -e DATA_DIR=/data \
  -v /path/to/data_files:/data \
  reporting-agent
```

---

## Adding a new report type

1. Create `src/generators/my_new_type.js` and export `async generateMyNewTypeReport(supplierName, opts)`.
2. Add `"my_new_type"` to the `REPORT_TYPES` array in `src/generators/index.js`.
3. Add a `case "my_new_type":` in the `generateReport` dispatcher.
4. Add the new type to the `REPORT_TYPES` array in `lovable-component/ReportGenerator.jsx`.

No other files need to change.

---

## Data requirements

The `DATA_DIR` folder must contain the following CSV files (subset is fine; missing files are skipped):

```
child_labour.csv        coastal_flooding.csv    drought.csv
humidex.csv             inland_flooding.csv     landslides.csv
modern_slavery.csv      restricted_goods.csv    tropical_storm.csv
waste_water.csv         wildfire.csv            worker_rights.csv
```

Each CSV must have at minimum: `supplier_name`, `facility_name`, `risk_type`, `risk_level`, `risk_confidence`, `risk_trend`, `timeframe`, and either a `context` column or numbered `risk_factor_N` columns.
