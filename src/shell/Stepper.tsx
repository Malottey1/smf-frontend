import { Fragment } from "react";

export type StepStatus = "done" | "current" | "upcoming" | "rejected";

export interface StepDef {
  key: string;
  label: string;
  status: StepStatus;
  /** Circle content when status is "done" or "rejected"; ignored otherwise
   * (upcoming/current show their 1-based position instead, matching the
   * mockup exactly). */
  glyph?: string;
}

export interface StepperProps {
  steps: StepDef[];
}

/**
 * Stepper — same circle-and-line construction, same teal completion fill,
 * same 22px padding as the mockup. The only addition is a "rejected"
 * status (red ring + dashed line), for FR-SMF-05's reject-with-comments
 * path, which the mockup's forward-only steppers never needed. See
 * DECISIONS.md for why this is an added status rather than a redesign —
 * a rejected step still reads as "a step," just an interrupted one.
 */
export function Stepper({ steps }: StepperProps) {
  return (
    <div className="stepper">
      {steps.map((step, i) => {
        const circleContent =
          step.status === "done" ? step.glyph ?? "✓" : step.status === "rejected" ? step.glyph ?? "✕" : String(i + 1);
        const lineAfter = i < steps.length - 1;
        const lineClass =
          step.status === "rejected" ? "step-line rejected" : step.status === "done" ? "step-line done" : "step-line";
        return (
          <Fragment key={step.key}>
            <div className={`step ${step.status}`}>
              <div className="circ">{circleContent}</div>
              <div className="label">{step.label}</div>
            </div>
            {lineAfter ? <div className={lineClass} /> : null}
          </Fragment>
        );
      })}
    </div>
  );
}
