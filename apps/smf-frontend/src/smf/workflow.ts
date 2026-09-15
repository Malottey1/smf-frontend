import type { StepDef } from "../shell/Stepper";
import type { ViewMode, DocStatus } from "./DocumentStatus";

/**
 * Maps the SMF workflow (Draft → Submitted → QA Review → Approved, with
 * reject-with-comments returning to Draft — FR-SMF-04/05/06) onto the
 * shell's Stepper. A rejection marks the QA Review step "rejected" rather
 * than removing it, so the interruption stays visible even after the
 * document is back in Draft — the return path, not just the current
 * state.
 */
export function buildWorkflowSteps(viewMode: ViewMode, docStatus: DocStatus, hasPendingComments: boolean): StepDef[] {
  if (viewMode === "approved" || viewMode === "historical") {
    return [
      { key: "draft", label: "Draft", status: "done" },
      { key: "submitted", label: "Submitted", status: "done" },
      { key: "qa", label: "QA Review", status: "done" },
      { key: "approved", label: "Approved", status: "done" },
    ];
  }
  if (docStatus === "qa_review") {
    return [
      { key: "draft", label: "Draft", status: "done" },
      { key: "submitted", label: "Submitted", status: "done" },
      { key: "qa", label: "QA Review", status: "current" },
      { key: "approved", label: "Approved", status: "upcoming" },
    ];
  }
  return [
    { key: "draft", label: "Draft", status: "current" },
    { key: "submitted", label: "Submitted", status: "upcoming" },
    { key: "qa", label: "QA Review", status: hasPendingComments ? "rejected" : "upcoming" },
    { key: "approved", label: "Approved", status: "upcoming" },
  ];
}
