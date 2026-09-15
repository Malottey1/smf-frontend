import { useEffect, useRef, useState } from "react";
import { Previewer } from "pagedjs";
import type { Template } from "../../../schema/template.schema";
import { buildExportHTML, type ExportDocMeta } from "./buildExportHTML";
import type { FieldValueMap } from "../completion";
import tokensCss from "../../design-system/tokens.css?raw";
import printCss from "./print.css?raw";

const BODY_PAGE_ADVISORY_THRESHOLD = 25;

export interface ExportPreviewProps {
  template: Template;
  values: FieldValueMap;
  annexDates: Record<string, string>;
  jurisdictionFiles: Record<string, { name: string; size: string }[]>;
  meta: ExportDocMeta;
}

/**
 * Client-side export preview, built from the same template.json that
 * drives the forms and paginated with Paged.js for real paged-media
 * layout (FR-SMF-09 through FR-SMF-14) — not a page-count estimate. This
 * is the reference layout the server-side PDF/A renderer must match
 * (see openapi/smf-api.yaml, /export/preview).
 *
 * Body page count (Chapters 1-9 only, excluding appendices, for the
 * FR-SMF-13 advisory) is read honestly off the rendered pages: an empty
 * marker element sits between Chapter 9 and Annex 1 in the source HTML,
 * and after Paged.js lays everything out, this finds which rendered
 * .pagedjs_page that marker ended up on.
 */
export function ExportPreview({ template, values, annexDates, jurisdictionFiles, meta }: ExportPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"rendering" | "ready" | "error">("rendering");
  const [totalPages, setTotalPages] = useState(0);
  const [bodyPages, setBodyPages] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    setStatus("rendering");

    // Paged.js has no cancellation API, and it writes into whatever DOM
    // node it's given as it paginates — a `cancelled` flag alone only
    // stops THIS effect's state updates, it does nothing to stop an
    // already-in-flight preview() call from still appending its pages
    // once it resolves. Under React 18 StrictMode (dev), the effect runs
    // twice in a row, and without this, both calls ended up appending
    // into the same visible container: every count in the export came
    // out exactly doubled (2 cover pages, 36 TOC entries instead of 18),
    // which is how this was actually found — by the Playwright suite
    // running against the real dev server, not by inspection.
    //
    // Fix: render into a scratch element every time, so two overlapping
    // runs never write into the same visible container. It has to stay
    // attached to the live document (just visually hidden) rather than
    // fully detached — Paged.js measures real layout (getBoundingClientRect
    // etc.) to paginate, and those return nothing usable for a node that
    // was never attached, which silently produced zero .pagedjs_page
    // elements when this was first tried fully detached. Only the run
    // that's still current when it resolves gets swapped into the
    // visible container; a superseded run's output is discarded with it.
    const scratch = document.createElement("div");
    scratch.style.position = "absolute";
    scratch.style.visibility = "hidden";
    scratch.style.pointerEvents = "none";
    scratch.style.top = "0";
    scratch.style.left = "0";
    document.body.appendChild(scratch);

    const html = buildExportHTML({ template, values, annexDates, jurisdictionFiles, meta });
    const previewer = new Previewer();

    previewer
      .preview(html, [{ "tokens.css": tokensCss }, { "print.css": printCss }], scratch)
      .then((flow: { total: number }) => {
        if (cancelled) {
          scratch.remove();
          return;
        }
        container.replaceChildren(...Array.from(scratch.childNodes));
        scratch.remove();
        setTotalPages(flow.total);

        const marker = container.querySelector("#body-end-marker");
        const page = marker?.closest(".pagedjs_page");
        if (page) {
          const pages = Array.from(container.querySelectorAll(".pagedjs_page"));
          setBodyPages(pages.indexOf(page) + 1);
        } else {
          setBodyPages(flow.total);
        }
        setStatus("ready");
      })
      .catch(() => {
        scratch.remove();
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, values, annexDates, jurisdictionFiles, meta]);

  const showAdvisory = bodyPages != null && bodyPages > BODY_PAGE_ADVISORY_THRESHOLD;

  return (
    <div className="export-preview-shell">
      <div className="export-toolbar">
        <div>
          <strong>WHO-format export preview</strong>
          <span className="hint" style={{ display: "block" }}>
            {status === "rendering"
              ? "Laying out pages…"
              : status === "error"
                ? "Could not render preview."
                : `${totalPages} page${totalPages === 1 ? "" : "s"} total · ${bodyPages ?? "—"} in the main body (Chapters 1–9)`}
          </span>
        </div>
        <button type="button" className="btn btn-ghost" disabled title="Server-side PDF/A generation is not implemented in this preview — see openapi/smf-api.yaml /export/pdf">
          Download PDF/A
        </button>
      </div>

      {showAdvisory && (
        <div className="export-advisory">
          <strong>Advisory</strong> — the main body is {bodyPages} pages, over the ~25–30 page range WHO guidance
          suggests for a Site Master File (FR-SMF-13). This does not block export or submission.
        </div>
      )}

      <div className="export-page-area" ref={containerRef} />
    </div>
  );
}
