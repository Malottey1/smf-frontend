/**
 * Generates a standalone, static HTML review page from schema/template.json
 * and openapi/smf-api.yaml — a browsable reference for stakeholder review
 * before the renderer is built. Not part of the app itself; a build tool
 * for producing a point-in-time review artifact.
 *
 * Run: npx tsx scripts/build-review-page.ts <output-path>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { load as loadYaml } from "js-yaml";
import { TemplateSchema, type Field } from "../schema/template.schema.ts";

const outPath = process.argv[2];
if (!outPath) {
  console.error("Usage: tsx scripts/build-review-page.ts <output-path>");
  process.exit(1);
}

const templateRaw = JSON.parse(readFileSync(resolve(import.meta.dirname, "../schema/template.json"), "utf-8"));
const template = TemplateSchema.parse(templateRaw);

const openapiRaw = readFileSync(resolve(import.meta.dirname, "../openapi/smf-api.yaml"), "utf-8");
const openapi = loadYaml(openapiRaw) as any;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const allFields: Field[] = template.chapters.flatMap((c) => c.subClauses.flatMap((sc) => sc.fields));
const totalConditional = allFields.filter((f) => f.condition !== null).length;
const totalSubClauses = template.chapters.reduce((n, c) => n + c.subClauses.length, 0);

const INPUT_TYPE_LABEL: Record<string, string> = {
  text: "Text",
  phone: "Phone",
  richText: "Rich text",
  dropdown: "Dropdown",
  multiSelect: "Multi-select",
  structuredNumeric: "Structured numeric",
  repeatableTable: "Repeatable table",
  fileUpload: "File upload",
  toggleWithText: "Toggle + text",
  mapPicker: "Map picker",
};

function fieldRow(f: Field, annexNumberById: Map<string, number>): string {
  const reqBadge = f.condition
    ? `<span class="tag tag-conditional">Conditional</span>`
    : f.required
      ? `<span class="tag tag-required">Required</span>`
      : `<span class="tag tag-optional">Optional</span>`;
  const gatingBadge = f.derivedGatingField ? `<span class="tag tag-gating">Added gate</span>` : "";
  const annex = f.annexLink ? annexNumberById.get(f.annexLink) : null;
  const annexCell = annex ? `<a class="annex-pill" href="#annex-${annex}">Annex ${annex}</a>` : "";
  const condition = f.condition
    ? `<div class="condition">if <code>${esc(f.condition.fieldId)}</code> ${f.condition.operator === "equals" ? "=" : "&ne;"} <code>${esc(
        JSON.stringify(f.condition.value),
      )}</code></div>`
    : "";
  const help = f.helpText ? `<div class="help">${esc(f.helpText)}</div>` : "";
  const note = f.note ? `<div class="note">${esc(f.note)}</div>` : "";
  return `
    <tr id="field-${esc(f.id)}" data-search="${esc((f.label + " " + f.id + " " + f.ref).toLowerCase())}">
      <td class="ref"><code>${esc(f.ref)}</code></td>
      <td class="label">
        <div class="label-text">${esc(f.label)}</div>
        ${help}${note}${condition}
        <div class="citation">${esc(f.whoCitation)}</div>
      </td>
      <td class="type"><span class="tag tag-type">${esc(INPUT_TYPE_LABEL[f.inputType] ?? f.inputType)}</span></td>
      <td class="req">${reqBadge}${gatingBadge}</td>
      <td class="annex">${annexCell}</td>
    </tr>`;
}

const annexNumberById = new Map(template.annexes.map((a) => [a.id, a.number]));

const chaptersHtml = template.chapters
  .map((c) => {
    const subClausesHtml = c.subClauses
      .map(
        (sc) => `
      <div class="subclause" id="clause-${esc(sc.ref)}">
        <div class="subclause-head">
          <code class="subclause-ref">${esc(sc.ref)}</code>
          <h3>${esc(sc.title)}</h3>
          <span class="citation">${esc(sc.whoCitation)}</span>
        </div>
        <div class="table-scroll">
          <table class="field-table">
            <thead>
              <tr><th>Ref</th><th>Field</th><th>Input type</th><th>Status</th><th>Annex</th></tr>
            </thead>
            <tbody>
              ${sc.fields.map((f) => fieldRow(f, annexNumberById)).join("")}
            </tbody>
          </table>
        </div>
      </div>`,
      )
      .join("");
    return `
    <section class="chapter" id="chapter-${c.number}">
      <div class="chapter-head">
        <span class="chapter-num">${c.number}</span>
        <div>
          <h2>${esc(c.title)}</h2>
          <span class="citation">${esc(c.whoCitation)}</span>
        </div>
        <span class="chapter-count">${c.subClauses.length} sub-clause${c.subClauses.length === 1 ? "" : "s"} · ${c.subClauses.reduce((n, sc) => n + sc.fields.length, 0)} fields</span>
      </div>
      ${subClausesHtml}
    </section>`;
  })
  .join("");

const annexesHtml = template.annexes
  .map((a) => {
    const cols = a.columns
      ? `<div class="annex-columns">${a.columns.map((col) => `<span class="col-chip">${esc(col.label)}</span>`).join("")}</div>`
      : "";
    return `
    <div class="annex-card" id="annex-${a.number}">
      <div class="annex-card-head">
        <span class="annex-badge">Annex ${a.number}</span>
        <span class="tag tag-dating">Independently dated</span>
      </div>
      <h3>${esc(a.title)}</h3>
      <div class="citation">${esc(a.whoCitation)}</div>
      <div class="annex-meta">
        <span><span class="meta-label">Input</span> ${esc(INPUT_TYPE_LABEL[a.inputType] ?? a.inputType)}</span>
        <span><span class="meta-label">Linked from</span> ${a.linkedFromRefs.map((r) => `<code>${esc(r)}</code>`).join(", ")}</span>
        ${a.sourceFieldId ? `<span><span class="meta-label">Source field</span> <a href="#field-${esc(a.sourceFieldId)}"><code>${esc(a.sourceFieldId)}</code></a></span>` : ""}
      </div>
      ${cols}
      ${a.note ? `<div class="note">${esc(a.note)}</div>` : ""}
    </div>`;
  })
  .join("");

const jurisdictionHtml = template.jurisdictionProfiles
  .map((p) => {
    const appendices = p.supplementaryAppendices
      .map(
        (ap) => `
      <div class="appendix-card">
        <div class="appendix-head">
          <h4>${esc(ap.title)}</h4>
          <span class="tag tag-advisory">Advisory · not a submission blocker</span>
        </div>
        <p class="appendix-desc">${esc(ap.description)}</p>
        <div class="provenance"><span class="meta-label">Provenance</span> ${esc(ap.provenance)}</div>
      </div>`,
      )
      .join("");
    return `
      <div class="jurisdiction-profile">
        <div class="jurisdiction-head">
          <h3>${esc(p.name)} <span class="citation">${esc(p.authority)}</span></h3>
          <span class="tag tag-review">Review interval: ${p.reviewIntervalMonths} months</span>
        </div>
        <p class="provenance">${esc(p.reviewIntervalProvenance)}</p>
        <div class="appendix-grid">${appendices}</div>
      </div>`;
  })
  .join("");

type OpenApiOp = { operationId?: string; summary?: string; tags?: string[]; responses?: Record<string, any> };
const paths = (openapi.paths ?? {}) as Record<string, Record<string, OpenApiOp>>;
const rows: { method: string; path: string; op: OpenApiOp }[] = [];
for (const [p, methods] of Object.entries(paths)) {
  for (const [method, op] of Object.entries(methods)) {
    if (["get", "post", "put", "patch", "delete"].includes(method)) {
      rows.push({ method: method.toUpperCase(), path: p, op: op as OpenApiOp });
    }
  }
}
const endpointsHtml = rows
  .map(
    (r) => `
    <tr>
      <td><span class="method method-${r.method.toLowerCase()}">${r.method}</span></td>
      <td><code>${esc(r.path)}</code></td>
      <td>${esc((r.op.summary ?? "").replace(/\s+/g, " ").trim())}</td>
      <td>${Object.keys(r.op.responses ?? {})
        .map((code) => `<span class="status-code status-${code[0]}xx">${code}</span>`)
        .join("")}</td>
    </tr>`,
  )
  .join("");

const html = `<title>SMF Schema &amp; Contract Review</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap">
<style>
  :root {
    --bg: #f7f9fc;
    --surface: #ffffff;
    --surface-2: #eef2f9;
    --ink: #0e1626;
    --ink-muted: #57687f;
    --ink-faint: #93a1b5;
    --border: #dce3ed;
    --accent: #1a56db;
    --accent-soft: #e8eefc;
    --mint: #0e9f6e;
    --mint-soft: #e3f9f0;
    --amber: #a4560a;
    --amber-soft: #fbebd6;
    --violet: #6d4acb;
    --violet-soft: #eee8fb;
    --shadow: 0 1px 2px rgba(14, 22, 38, 0.04), 0 8px 24px -12px rgba(14, 22, 38, 0.12);
    --mono: ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #0b1220;
      --surface: #121b2e;
      --surface-2: #17223a;
      --ink: #e7ecf6;
      --ink-muted: #a6b3c9;
      --ink-faint: #6c7c97;
      --border: #223047;
      --accent: #6d93f5;
      --accent-soft: #1b2a4d;
      --mint: #34d399;
      --mint-soft: #113228;
      --amber: #f0b65c;
      --amber-soft: #3a2a10;
      --violet: #b39dfa;
      --violet-soft: #241b40;
      --shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 8px 24px -12px rgba(0, 0, 0, 0.5);
    }
  }
  :root[data-theme="dark"] {
    --bg: #0b1220;
    --surface: #121b2e;
    --surface-2: #17223a;
    --ink: #e7ecf6;
    --ink-muted: #a6b3c9;
    --ink-faint: #6c7c97;
    --border: #223047;
    --accent: #6d93f5;
    --accent-soft: #1b2a4d;
    --mint: #34d399;
    --mint-soft: #113228;
    --amber: #f0b65c;
    --amber-soft: #3a2a10;
    --violet: #b39dfa;
    --violet-soft: #241b40;
    --shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 8px 24px -12px rgba(0, 0, 0, 0.5);
  }

  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--ink);
    font-family: "Inter", ui-sans-serif, system-ui, sans-serif;
    font-size: 15px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }
  h1, h2, h3, h4 { font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif; text-wrap: balance; margin: 0; }
  code { font-family: var(--mono); font-size: 0.88em; }
  a { color: var(--accent); }
  a:focus-visible, button:focus-visible, input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .layout { display: grid; grid-template-columns: 272px 1fr; min-height: 100vh; }
  @media (max-width: 860px) { .layout { grid-template-columns: 1fr; } .nav { position: static; height: auto; } }

  .nav {
    position: sticky; top: 0; height: 100vh; overflow-y: auto;
    background: var(--surface-2); border-right: 1px solid var(--border);
    padding: 20px 16px 32px;
  }
  .nav-brand { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
  .nav-brand .mark { font-family: "Plus Jakarta Sans"; font-weight: 800; font-size: 17px; letter-spacing: -0.01em; }
  .nav-sub { color: var(--ink-muted); font-size: 12.5px; margin-bottom: 18px; }
  .nav-status {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--amber-soft); color: var(--amber); border: 1px solid color-mix(in srgb, var(--amber) 35%, transparent);
    font-weight: 600; font-size: 12px; padding: 4px 10px; border-radius: 100px; margin-bottom: 20px;
  }
  .nav-status::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--amber); }
  .nav-group { margin-bottom: 18px; }
  .nav-group-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--ink-faint); padding: 0 10px; margin-bottom: 6px; }
  .nav a.nav-link {
    display: flex; align-items: baseline; gap: 8px; text-decoration: none; color: var(--ink-muted);
    padding: 6px 10px; border-radius: 8px; font-size: 13.5px; font-weight: 500;
  }
  .nav a.nav-link:hover { background: var(--surface); color: var(--ink); }
  .nav a.nav-link .n { font-family: var(--mono); color: var(--ink-faint); font-size: 12px; min-width: 20px; }
  .nav-search { margin-bottom: 16px; }
  .nav-search input {
    width: 100%; border: 1px solid var(--border); background: var(--surface); color: var(--ink);
    border-radius: 8px; padding: 8px 10px; font-size: 13px; font-family: inherit;
  }
  .nav-search input::placeholder { color: var(--ink-faint); }

  main { padding: 32px clamp(20px, 4vw, 56px) 96px; max-width: 1080px; }

  .hero { margin-bottom: 28px; }
  .hero-eyebrow { color: var(--accent); font-weight: 700; font-size: 12.5px; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 8px; }
  .hero h1 { font-size: clamp(26px, 3.4vw, 34px); font-weight: 800; letter-spacing: -0.015em; margin-bottom: 10px; }
  .hero p { color: var(--ink-muted); max-width: 66ch; font-size: 15.5px; }

  .stat-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin: 24px 0 36px; }
  .stat { background: var(--surface); padding: 16px 18px; }
  .stat .num { font-family: "Plus Jakarta Sans"; font-weight: 800; font-size: 24px; font-variant-numeric: tabular-nums; }
  .stat .lbl { color: var(--ink-muted); font-size: 12px; margin-top: 2px; }

  section.block { margin-bottom: 48px; scroll-margin-top: 20px; }
  .block-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px; }
  .block-head h2 { font-size: 21px; font-weight: 800; }
  .block-desc { color: var(--ink-muted); font-size: 14px; max-width: 72ch; margin-bottom: 20px; }

  .chapter { scroll-margin-top: 16px; margin-bottom: 36px; border: 1px solid var(--border); border-radius: 14px; background: var(--surface); box-shadow: var(--shadow); overflow: hidden; }
  .chapter-head { display: flex; align-items: center; gap: 14px; padding: 16px 20px; border-bottom: 1px solid var(--border); background: var(--surface-2); }
  .chapter-num { font-family: "Plus Jakarta Sans"; font-weight: 800; font-size: 15px; color: var(--accent); background: var(--accent-soft); width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 8px; flex-shrink: 0; }
  .chapter-head h2 { font-size: 16.5px; font-weight: 700; }
  .chapter-head .citation { display: block; color: var(--ink-faint); font-family: var(--mono); font-size: 11px; margin-top: 2px; }
  .chapter-count { margin-left: auto; color: var(--ink-faint); font-size: 12px; white-space: nowrap; }

  .subclause { border-top: 1px solid var(--border); padding: 16px 20px 18px 20px; scroll-margin-top: 16px; }
  .subclause:first-of-type { border-top: none; }
  .subclause-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
  .subclause-ref { color: var(--accent); font-weight: 600; font-size: 12.5px; background: var(--accent-soft); padding: 2px 7px; border-radius: 6px; }
  .subclause-head h3 { font-size: 14.5px; font-weight: 700; }
  .subclause-head .citation { color: var(--ink-faint); font-family: var(--mono); font-size: 11px; margin-left: auto; }

  .table-scroll { overflow-x: auto; border: 1px solid var(--border); border-radius: 10px; }
  table.field-table { width: 100%; border-collapse: collapse; font-size: 13.2px; }
  table.field-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-faint); font-weight: 700; padding: 9px 12px; background: var(--surface-2); border-bottom: 1px solid var(--border); white-space: nowrap; }
  table.field-table td { padding: 10px 12px; border-bottom: 1px solid var(--border); vertical-align: top; }
  table.field-table tr:last-child td { border-bottom: none; }
  table.field-table td.ref code { color: var(--ink-muted); }
  .label-text { font-weight: 600; margin-bottom: 2px; }
  .help { color: var(--ink-muted); font-size: 12.3px; margin-top: 2px; }
  .note { color: var(--violet); background: var(--violet-soft); font-size: 12px; padding: 4px 8px; border-radius: 6px; margin-top: 5px; display: inline-block; }
  .condition { font-size: 12px; color: var(--ink-muted); margin-top: 4px; }
  .condition code { color: var(--accent); }
  .citation { color: var(--ink-faint); font-family: var(--mono); font-size: 11px; margin-top: 4px; display: block; }

  .tag { display: inline-flex; align-items: center; font-size: 11px; font-weight: 600; padding: 2.5px 8px; border-radius: 100px; white-space: nowrap; }
  .tag-required { background: var(--surface-2); color: var(--ink-muted); border: 1px solid var(--border); }
  .tag-optional { background: var(--surface-2); color: var(--ink-faint); border: 1px solid var(--border); }
  .tag-conditional { background: var(--amber-soft); color: var(--amber); }
  .tag-gating { background: var(--violet-soft); color: var(--violet); margin-left: 4px; }
  .tag-type { background: var(--accent-soft); color: var(--accent); }
  .tag-dating { background: var(--mint-soft); color: var(--mint); }
  .tag-advisory { background: var(--amber-soft); color: var(--amber); }
  .tag-review { background: var(--surface-2); color: var(--ink-muted); border: 1px solid var(--border); }
  .annex-pill { display: inline-block; font-size: 11.5px; font-weight: 600; color: var(--accent); text-decoration: none; }
  .annex-pill:hover { text-decoration: underline; }

  .annex-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
  .annex-card { border: 1px solid var(--border); border-radius: 12px; background: var(--surface); padding: 16px 18px; scroll-margin-top: 16px; box-shadow: var(--shadow); }
  .annex-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .annex-badge { font-family: "Plus Jakarta Sans"; font-weight: 800; font-size: 12.5px; color: var(--mint); }
  .annex-card h3 { font-size: 14.5px; font-weight: 700; margin-bottom: 4px; }
  .annex-meta { display: flex; flex-direction: column; gap: 3px; font-size: 12px; color: var(--ink-muted); margin: 10px 0 8px; }
  .meta-label { color: var(--ink-faint); font-weight: 600; margin-right: 4px; }
  .annex-columns { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .col-chip { font-size: 11px; background: var(--surface-2); color: var(--ink-muted); padding: 2px 8px; border-radius: 100px; }

  .jurisdiction-profile { border: 1px solid var(--border); border-radius: 14px; background: var(--surface); padding: 20px 22px; box-shadow: var(--shadow); }
  .jurisdiction-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 4px; flex-wrap: wrap; }
  .jurisdiction-head h3 { font-size: 17px; font-weight: 700; }
  .jurisdiction-head .citation { font-size: 12px; color: var(--ink-faint); font-family: var(--mono); display: inline; }
  .provenance { color: var(--ink-muted); font-size: 12.5px; margin: 6px 0 16px; max-width: 70ch; }
  .appendix-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
  .appendix-card { border: 1px dashed color-mix(in srgb, var(--amber) 45%, var(--border)); background: var(--amber-soft); border-radius: 10px; padding: 13px 15px; }
  .appendix-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
  .appendix-head h4 { font-size: 13.5px; font-weight: 700; }
  .appendix-desc { font-size: 12.3px; color: var(--ink-muted); margin: 0 0 8px; }

  .api-desc { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; margin-bottom: 18px; font-size: 13.5px; color: var(--ink-muted); box-shadow: var(--shadow); }
  .api-desc strong { color: var(--ink); }
  table.endpoints { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; box-shadow: var(--shadow); }
  table.endpoints th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-faint); padding: 10px 14px; background: var(--surface-2); border-bottom: 1px solid var(--border); }
  table.endpoints td { padding: 9px 14px; border-bottom: 1px solid var(--border); vertical-align: top; }
  table.endpoints tr:last-child td { border-bottom: none; }
  .method { font-family: var(--mono); font-weight: 700; font-size: 11px; padding: 2px 7px; border-radius: 5px; }
  .method-get { background: var(--mint-soft); color: var(--mint); }
  .method-post { background: var(--accent-soft); color: var(--accent); }
  .method-put { background: var(--violet-soft); color: var(--violet); }
  .method-patch { background: var(--amber-soft); color: var(--amber); }
  .status-code { font-family: var(--mono); font-size: 10.5px; color: var(--ink-faint); margin-right: 6px; }

  .qa-list { display: flex; flex-direction: column; gap: 14px; }
  .qa-item { border: 1px solid var(--border); border-left: 3px solid var(--amber); border-radius: 0 10px 10px 0; background: var(--surface); padding: 14px 18px; box-shadow: var(--shadow); }
  .qa-item .qn { font-family: "Plus Jakarta Sans"; font-weight: 700; font-size: 13.5px; margin-bottom: 4px; }
  .qa-item p { margin: 0; font-size: 13.3px; color: var(--ink-muted); }

  footer { color: var(--ink-faint); font-size: 12px; padding: 24px clamp(20px, 4vw, 56px) 60px; max-width: 1080px; border-top: 1px solid var(--border); margin-top: 12px; }

  .hidden-by-search { display: none !important; }
</style>

<div class="layout">
  <nav class="nav" aria-label="Document sections">
    <div class="nav-brand"><span class="mark">SMF</span><span style="color:var(--ink-faint); font-size:12px;">/ Phase 1</span></div>
    <div class="nav-sub">Schema &amp; API contract review</div>
    <div class="nav-status">Awaiting review</div>

    <div class="nav-search">
      <input type="search" id="fieldSearch" placeholder="Filter fields by name or ref&hellip;" aria-label="Filter fields">
    </div>

    <div class="nav-group">
      <div class="nav-group-label">Chapters</div>
      ${template.chapters
        .map((c) => `<a class="nav-link" href="#chapter-${c.number}"><span class="n">${c.number}</span>${esc(c.title)}</a>`)
        .join("")}
    </div>
    <div class="nav-group">
      <div class="nav-group-label">Reference</div>
      <a class="nav-link" href="#annexes"><span class="n">§</span>Annexes 1&ndash;8</a>
      <a class="nav-link" href="#jurisdiction"><span class="n">§</span>Jurisdiction profiles</a>
      <a class="nav-link" href="#api"><span class="n">§</span>API contract</a>
      <a class="nav-link" href="#open-questions"><span class="n">!</span>Open questions</a>
    </div>
  </nav>

  <main>
    <div class="hero">
      <div class="hero-eyebrow">${esc(template.documentStandard.name)}</div>
      <h1>SMF schema &amp; API contract — review copy</h1>
      <p>Every field below is transcribed from ${esc(template.documentStandard.ursReference)} and carries the WHO clause it derives from. This is the checkpoint before the form renderer is built on top of it — flag anything that looks wrong before it becomes the shape of 82 form fields.</p>
    </div>

    <div class="stat-row">
      <div class="stat"><div class="num">9</div><div class="lbl">Chapters</div></div>
      <div class="stat"><div class="num">${totalSubClauses}</div><div class="lbl">Sub-clauses</div></div>
      <div class="stat"><div class="num">${allFields.length}</div><div class="lbl">Fields</div></div>
      <div class="stat"><div class="num">${totalConditional}</div><div class="lbl">Conditional</div></div>
      <div class="stat"><div class="num">8</div><div class="lbl">Annexes</div></div>
      <div class="stat"><div class="num">${rows.length}</div><div class="lbl">API endpoints</div></div>
    </div>

    <section class="block" id="chapters">
      <div class="block-head"><h2>Chapters 1&ndash;9</h2></div>
      <p class="block-desc">Field-level breakdown per WHO chapter and sub-clause. <span class="tag tag-gating">Added gate</span> marks a small Yes/No field invented to make a URS-stated conditional testable — see Open questions.</p>
      ${chaptersHtml}
    </section>

    <section class="block" id="annexes">
      <div class="block-head"><h2>Annexes 1&ndash;8</h2></div>
      <p class="block-desc">Each annex is dated and versioned independently of the parent document (FR-SMF-03). Most wrap a field that also appears inline in its source chapter — same document, dual metadata, not a duplicate upload.</p>
      <div class="annex-grid">${annexesHtml}</div>
    </section>

    <section class="block" id="jurisdiction">
      <div class="block-head"><h2>Jurisdiction profiles</h2></div>
      <p class="block-desc">Jurisdiction is configuration, not code. Ghana is the first profile; NAFDAC, PPB, EU, and PIC/S profiles slot in the same way later without touching the renderer.</p>
      ${jurisdictionHtml}
    </section>

    <section class="block" id="api">
      <div class="block-head"><h2>API contract</h2></div>
      <div class="api-desc">
        <strong>Optimistic concurrency</strong> — every write carries a <code>revision</code> token via <code>If-Match</code>; a stale write gets <code>409</code> with the server's current state, not silent overwrite.
        &nbsp;·&nbsp; <strong>Uploads</strong> use the tus resumable protocol for large P&amp;ID/CAD files.
        &nbsp;·&nbsp; <strong>Chapters and annexes version independently</strong> — saving one never bumps another's revision or the document edition.
      </div>
      <div class="table-scroll">
        <table class="endpoints">
          <thead><tr><th>Method</th><th>Path</th><th>Summary</th><th>Responses</th></tr></thead>
          <tbody>${endpointsHtml}</tbody>
        </table>
      </div>
    </section>

    <section class="block" id="open-questions">
      <div class="block-head"><h2>Open questions</h2></div>
      <p class="block-desc">Flagged in DECISIONS.md — judgment calls made to keep moving, not settled decisions.</p>
      <div class="qa-list">
        <div class="qa-item">
          <div class="qn">1. Annex duplication model</div>
          <p>Assumed a chapter's file upload (e.g. GMP certificate) and its Annex entry are the same document, with the Annex layering on an independent effective date — not two uploads a user keeps in sync by hand.</p>
        </div>
        <div class="qa-item">
          <div class="qn">2. Six invented gating fields</div>
          <p>Added ahead of URS rows marked "Conditional" without a stated trigger (e.g. "Does this site have multiple Authorized Persons?"), so completion % has a real boolean to test per field.</p>
        </div>
        <div class="qa-item">
          <div class="qn">3. Chapter ownership</div>
          <p><code>ownerId</code> is modeled in the API contract but no assignment UI is built yet — confirm that split is the right level of commitment for Phase 1.</p>
        </div>
      </div>
    </section>
  </main>
</div>

<footer>Generated from schema/template.json and openapi/smf-api.yaml — regenerate with <code>npx tsx scripts/build-review-page.ts</code>.</footer>

<script>
  (function () {
    var input = document.getElementById('fieldSearch');
    var rows = Array.prototype.slice.call(document.querySelectorAll('table.field-table tbody tr'));
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      rows.forEach(function (r) {
        var match = !q || (r.getAttribute('data-search') || '').indexOf(q) !== -1;
        r.classList.toggle('hidden-by-search', !match);
      });
      document.querySelectorAll('.subclause').forEach(function (sc) {
        var visible = Array.prototype.slice.call(sc.querySelectorAll('tbody tr')).some(function (r) {
          return !r.classList.contains('hidden-by-search');
        });
        sc.classList.toggle('hidden-by-search', !visible);
      });
    });
  })();
</script>
`;

writeFileSync(outPath, html, "utf-8");
console.log(`Wrote ${outPath} (${(html.length / 1024).toFixed(1)} KB)`);
