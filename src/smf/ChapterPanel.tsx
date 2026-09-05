import templateJson from "../../schema/template.json";
import type { Chapter, Field as FieldSchema, Template } from "../../schema/template.schema";
import { Panel, PanelHeader, PanelBody, PanelActions } from "../shell/Panel";
import { Stepper } from "../shell/Stepper";
import { SectionTitle, Grid2, Field, Button } from "../shell/Fields";
import { FieldInput } from "./FieldInput";
import { FieldValue } from "./FieldValue";
import { ConflictBanner } from "./ConflictBanner";
import { findFieldById } from "./fieldLookup";
import { evaluateCondition, type FieldValueMap, type Condition } from "./completion";

const TEMPLATE = templateJson as Template;
import { buildWorkflowSteps } from "./workflow";
import type { ViewMode, DocStatus } from "./DocumentStatus";
import type { ChapterConflict } from "./useChapterAutosave";

export interface ReviewComment {
  chapterRef: string;
  text: string;
}

export interface ChapterPanelProps {
  chapter: Chapter;
  values: FieldValueMap;
  onFieldChange: (field: FieldSchema, value: unknown) => void;
  viewMode: ViewMode;
  docStatus: DocStatus;
  hasPendingComments: boolean;
  comment?: ReviewComment;
  savingLabel: string;
  conflict: ChapterConflict | null;
  onResolveKeepMine: () => void;
  onResolveDiscardMine: () => void;
  onSendForReview: () => void;
  onApprove: () => void;
  onOpenReject: () => void;
}

/**
 * Full chapter screen: same Panel/PanelHeader/body/PanelActions structure
 * and the same Stepper component as the mockup's records, driven by the
 * SMF workflow instead of a deviation's or batch's. Fields render through
 * the field-type registry (FieldInput/FieldValue) rather than being
 * hand-authored per chapter — nine chapters is configuration here, same
 * as the URS requires. Values, saving, and 409 conflicts are all owned by
 * useChapterAutosave (SMFModule) — this component only renders them.
 */
export function ChapterPanel({
  chapter,
  values,
  onFieldChange,
  viewMode,
  docStatus,
  hasPendingComments,
  comment,
  savingLabel,
  conflict,
  onResolveKeepMine,
  onResolveDiscardMine,
  onSendForReview,
  onApprove,
  onOpenReject,
}: ChapterPanelProps) {
  const editable = viewMode === "current" && docStatus === "draft";
  const steps = buildWorkflowSteps(viewMode, docStatus, hasPendingComments);
  const conflictInThisChapter = conflict && chapter.subClauses.some((sc) => sc.ref === conflict.ref) ? conflict : null;

  return (
    <Panel>
      <PanelHeader title={chapter.title} identifier={chapter.whoCitation} />
      <Stepper steps={steps} />

      {comment && editable && (
        <div className="comment-banner">
          <strong>QA reviewer comment — Chapter {chapter.number}</strong>
          <p>{comment.text}</p>
        </div>
      )}

      {conflictInThisChapter && (
        <ConflictBanner
          title={`sub-clause ${conflictInThisChapter.ref}`}
          conflict={conflictInThisChapter.info}
          labelFor={(key) => findFieldById(TEMPLATE.chapters, key)?.label ?? key}
          onKeepMine={onResolveKeepMine}
          onDiscardMine={onResolveDiscardMine}
        />
      )}

      <PanelBody>
        {chapter.subClauses.map((sc) => (
          <div key={sc.ref}>
            <SectionTitle>
              <span className="subclause-ref-badge mono">{sc.ref}</span>
              {sc.title}
            </SectionTitle>
            <Grid2>
              {sc.fields.map((f) => {
                const hidden = f.condition != null && !evaluateCondition(f.condition as Condition, values);
                if (hidden) return null;
                const isLongText = f.inputType === "richText" || f.inputType === "repeatableTable" || f.inputType === "fileUpload";
                return (
                  <Field key={f.id} label={f.label} hint={f.helpText ?? undefined} fullWidth={isLongText}>
                    {editable ? (
                      <FieldInput field={f} value={values[f.id]} onChange={(v) => onFieldChange(f, v)} />
                    ) : (
                      <FieldValue field={f} value={values[f.id]} />
                    )}
                  </Field>
                );
              })}
            </Grid2>
          </div>
        ))}
      </PanelBody>

      <PanelActions note={editable ? savingLabel : viewMode === "approved" ? "Approved — read only" : "Historical — read only"}>
        {editable && docStatus === "draft" && (
          <Button variant="primary" onClick={onSendForReview}>
            Send for QA review
          </Button>
        )}
        {viewMode === "current" && docStatus === "qa_review" && (
          <>
            <Button variant="ghost" onClick={onOpenReject}>
              Reject with comment
            </Button>
            <Button variant="primary" onClick={onApprove}>
              Approve
            </Button>
          </>
        )}
      </PanelActions>
    </Panel>
  );
}
