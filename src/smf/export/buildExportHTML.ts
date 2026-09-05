import type { Template } from "../../../schema/template.schema";
import { evaluateCondition, type Condition, type FieldValueMap } from "../completion";
import { fieldToExportCell, isInlineImageField, type ExportCell } from "./formatForExport";
import { findFieldById } from "../fieldLookup";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderCell(cell: ExportCell, inlineImage: boolean): string {
  switch (cell.kind) {
    case "empty":
      return `<p class="doc-empty">Not provided</p>`;
    case "text":
      return cell.text.trim() ? `<p class="doc-field-value">${esc(cell.text)}</p>` : `<p class="doc-empty">Not provided</p>`;
    case "chips":
      return cell.items.length
        ? `<p class="doc-field-value doc-chips">${cell.items.map((i) => `<span class="doc-chip">${esc(i)}</span>`).join("")}</p>`
        : `<p class="doc-empty">Not provided</p>`;
    case "table":
      return `<table class="doc-table"><thead><tr>${cell.columns
        .map((c) => `<th>${esc(c.label)}</th>`)
        .join("")}</tr></thead><tbody>${cell.rows
        .map((row) => `<tr>${cell.columns.map((c) => `<td>${esc(row[c.id] ?? "—")}</td>`).join("")}</tr>`)
        .join("")}</tbody></table>`;
    case "image-slot":
      if (cell.files.length === 0) return `<p class="doc-empty">Not provided</p>`;
      return cell.files
        .map((f) =>
          inlineImage
            ? `<div class="doc-image-frame"><div class="doc-image-glyph">🖼</div><div class="doc-image-caption">${esc(f.name)} <span class="doc-image-size">${esc(f.size)}</span></div></div>`
            : `<p class="doc-field-value doc-file-ref">📎 ${esc(f.name)} <span class="doc-image-size">${esc(f.size)}</span></p>`,
        )
        .join("");
  }
}

export interface ExportDocMeta {
  manufacturerAndSite: string;
  editionLabel: string;
  effectiveDate: string;
  nextReviewDate: string;
}

export interface ExportSourceData {
  template: Template;
  values: FieldValueMap;
  annexDates: Record<string, string>;
  jurisdictionFiles: Record<string, { name: string; size: string }[]>;
  meta: ExportDocMeta;
}

/**
 * Builds the export document as an HTML string in the fixed WHO order
 * (FR-SMF-09): cover, TOC, Chapters 1-9, then Annexes 1-8, then — since
 * the active profile is Ghana — the supplementary appendices as a final
 * labelled section (FR-SMF-14). TOC page numbers are NOT hand-computed;
 * they use CSS target-counter() so Paged.js fills them in from the real
 * layout (print.css). An empty #body-end-marker sits between Chapter 9
 * and Annex 1 so the caller can find which rendered page it lands on and
 * report an honest main-body page count for the FR-SMF-13 advisory.
 */
export function buildExportHTML({ template, values, annexDates, jurisdictionFiles, meta }: ExportSourceData): string {
  const ghanaProfile = template.jurisdictionProfiles.find((p) => p.id === "gh");

  const tocChapters = template.chapters
    .map(
      (c) =>
        `<a class="toc-entry" href="#chapter-${c.number}"><span class="toc-label">${c.number}. ${esc(c.title)}</span><span class="toc-leader"></span></a>`,
    )
    .join("");
  const tocAnnexes = template.annexes
    .map(
      (a) =>
        `<a class="toc-entry" href="#annex-${a.number}"><span class="toc-label">Annex ${a.number} — ${esc(a.title)}</span><span class="toc-leader"></span></a>`,
    )
    .join("");
  const tocAppendix = ghanaProfile
    ? `<a class="toc-entry" href="#appendices"><span class="toc-label">${esc(ghanaProfile.name)} Supplementary Appendices</span><span class="toc-leader"></span></a>`
    : "";

  const chaptersHTML = template.chapters
    .map((chapter) => {
      const subClausesHTML = chapter.subClauses
        .map((sc) => {
          const fieldsHTML = sc.fields
            .map((f) => {
              const hidden = f.condition != null && !evaluateCondition(f.condition as Condition, values);
              if (hidden) return "";
              const cell = fieldToExportCell(f, values[f.id]);
              return `<div class="doc-field">
                <div class="doc-field-label">${esc(f.label)}</div>
                ${renderCell(cell, isInlineImageField(f))}
              </div>`;
            })
            .join("");
          return `<div class="doc-subclause">
            <h3><span class="subclause-ref mono">${esc(sc.ref)}</span>${esc(sc.title)}</h3>
            ${fieldsHTML}
          </div>`;
        })
        .join("");
      return `<section class="doc-chapter" id="chapter-${chapter.number}">
        <h2><span class="chapter-num">${chapter.number}</span>${esc(chapter.title)}</h2>
        <div class="doc-citation">${esc(chapter.whoCitation)}</div>
        ${subClausesHTML}
      </section>`;
    })
    .join("");

  const annexesHTML = template.annexes
    .map((a) => {
      const field = a.sourceFieldId ? findFieldById(template.chapters, a.sourceFieldId) : undefined;
      const body = field
        ? renderCell(fieldToExportCell(field, values[a.sourceFieldId!]), isInlineImageField(field) || ["annex-5", "annex-6", "annex-7"].includes(a.id))
        : `<p class="doc-empty">Not provided</p>`;
      return `<section class="doc-annex" id="annex-${a.number}">
        <h2><span class="annex-num">Annex ${a.number}</span>${esc(a.title)}</h2>
        <div class="doc-citation">${esc(a.whoCitation)} · Effective ${esc(annexDates[a.id] ?? "—")} · Rev. 1</div>
        <div class="doc-citation">Referenced from clause${a.linkedFromRefs.length > 1 ? "s" : ""} ${esc(a.linkedFromRefs.join(", "))}</div>
        ${body}
      </section>`;
    })
    .join("");

  const appendicesHTML = ghanaProfile
    ? `<section class="doc-appendices-intro" id="appendices">
        <h2>${esc(ghanaProfile.name)} Supplementary Appendices <span class="advisory-tag">Advisory only — FR-SMF-16</span></h2>
        <p class="doc-field-value">Not officially confirmed against Ghana FDA's published guidance. Nothing in this section blocked submission of this edition.</p>
      </section>
      ${ghanaProfile.supplementaryAppendices
        .map((ap) => {
          const files = jurisdictionFiles[ap.id] ?? [];
          const body =
            files.length > 0
              ? files.map((f) => `<p class="doc-field-value doc-file-ref">📎 ${esc(f.name)} <span class="doc-image-size">${esc(f.size)}</span></p>`).join("")
              : `<p class="doc-empty">Not provided</p>`;
          return `<div class="doc-subclause">
            <h3>${esc(ap.title)}</h3>
            ${body}
          </div>`;
        })
        .join("")}`
    : "";

  return `
    <section class="cover-page">
      <div class="cover-eyebrow">Site Master File</div>
      <h1>${esc(meta.manufacturerAndSite)}</h1>
      <dl class="cover-meta">
        <div><dt>Edition</dt><dd>${esc(meta.editionLabel)}</dd></div>
        <div><dt>Effective date</dt><dd>${esc(meta.effectiveDate)}</dd></div>
        <div><dt>Next review date</dt><dd>${esc(meta.nextReviewDate)}</dd></div>
      </dl>
      <div class="cover-standard">Prepared per WHO Technical Report Series No. 961 (2011), Annex 14</div>
    </section>

    <section class="toc-page">
      <h2>Table of Contents</h2>
      <nav class="toc">
        <div class="toc-group-label">Chapters</div>
        ${tocChapters}
        <div class="toc-group-label">Annexes</div>
        ${tocAnnexes}
        ${ghanaProfile ? `<div class="toc-group-label">Appendices</div>${tocAppendix}` : ""}
      </nav>
    </section>

    ${chaptersHTML}

    <div id="body-end-marker"></div>

    <section class="doc-annexes-intro" style="break-before:page">
      <h2>Annexes</h2>
    </section>
    ${annexesHTML}

    ${appendicesHTML}
  `;
}
