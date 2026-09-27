<div align="center">

# ✦ Preact Dev Trace Explorer

**A local-first distributed trace workspace for request waterfalls, critical paths, service dependencies, and span-level investigation.**

![Preact](https://img.shields.io/badge/Preact-10-673ab8?style=for-the-badge&logo=preact&logoColor=ffffff)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?style=for-the-badge&logo=typescript&logoColor=ffffff)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=ffffff)
![Tracing](https://img.shields.io/badge/Tracing-Waterfall_&_DAG-0e7490?style=for-the-badge)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=ffffff)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

</div>

---

## ✨ Highlights

- **Trace Stream:** Searches routes, operations, trace IDs, services, environments, and success or error states.
- **Waterfall View:** Aligns every span against the complete request duration with operation nesting and stable timing guides.
- **Critical Chain:** Derives the longest completion route from parent relationships and highlights its spans.
- **Span Inspector:** Shows service, kind, timing, attributes, trace context, and a persistent investigation note.
- **Service Map:** Builds a Dagre dependency graph from cross-service parent-child calls and marks failing edges.
- **Service Metrics:** Aggregates span count, cumulative duration, and errors for each service in the selected trace.
- **Workspace Import and Export:** Validates complete JSON workspaces and downloads the current investigation state.
- **Validated Persistence:** Uses Zod and IndexedDB with recovery from malformed local data and a one-click sample reset.
- **Responsive Workflow:** Provides focused Traces, Waterfall, Map, and Span views on compact screens and a dense three-pane desktop layout.

## 🧱 Project Structure

```text
public/
|-- favicon.svg
`-- sample-traces.json
src/
|-- app.tsx
|-- main.tsx
|-- index.css
|-- components/
|   |-- service-map.tsx
|   |-- span-inspector.tsx
|   |-- trace-list.tsx
|   |-- trace-waterfall.tsx
|   `-- workspace-state.tsx
|-- domain/
|   `-- traces.ts
`-- services/
    `-- trace-store.ts
```

## 🛠️ Tech Stack

- Preact 10 with Vite 8
- TypeScript 6
- Tailwind CSS 4
- `@dagrejs/dagre`, `date-fns`, `zod`, `idb-keyval`, and `lucide-preact`

## 📦 Included Sample Data

`public/sample-traces.json` contains four fictional commerce traces with nested spans, cross-service dependencies, successful requests, a payment timeout, searchable attributes, and editable investigation notes.

## 🚀 Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## 🔌 Extension Notes & Nuances

- The fixture is OpenTelemetry-shaped but intentionally smaller than the full OTLP envelope. Adapt the import boundary when connecting an OTLP or vendor export.
- Waterfall offsets and durations are milliseconds relative to the selected trace start.
- The critical chain follows the span ending latest and then walks its parent lineage; it is an investigation aid rather than a distributed critical-path proof.
- Service-map edges are derived only when a child span belongs to a different service than its parent.
- Import and export operate entirely in the browser. No telemetry is uploaded or sent to a tracing backend.
- The sample is fictional and must not be interpreted as production observability data.

## 🧪 Build & Checks

```bash
npm run format:check
npm run build
npm run preview
```

## 🌐 Vercel Deployment

The repository includes a Vite-ready `vercel.json` with SPA rewrites.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## 📄 License

MIT License. See [LICENSE](./LICENSE).
