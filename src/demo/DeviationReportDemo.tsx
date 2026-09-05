import { useState } from "react";
import { Panel, PanelHeader, PanelBody, PanelActions } from "../shell/Panel";
import { Stepper } from "../shell/Stepper";
import { SectionTitle, Grid2, Field, ReadonlyId, PillGroup, UploadBox, Button } from "../shell/Fields";
import { Sidebar, AuditTrailCard, StatusRowsCard, GuidanceCard } from "../shell/Sidebar";

/**
 * Reproduces the mockup's Deviation Report tab using the componentized
 * shell + tokens, for fidelity comparison against gxp-console-mockup.html.
 * Not an SMF screen — this is the "prove the port is faithful" checkpoint.
 */
export function DeviationReportDemo() {
  const [severity, setSeverity] = useState<string | null>("critical");

  return (
    <div className="content">
      <Panel>
        <PanelHeader title="Deviation Report" identifier="DRAFT — will assign DEV-ID on submit" />
        <Stepper
          steps={[
            { key: "draft", label: "Draft", status: "done" },
            { key: "qa", label: "QA Review", status: "current" },
            { key: "capa", label: "CAPA Linked", status: "upcoming" },
            { key: "closed", label: "Closed", status: "upcoming" },
          ]}
        />
        <PanelBody>
          <SectionTitle>Identification</SectionTitle>
          <Grid2>
            <Field label="Batch / Lot number (if applicable)">
              <input type="text" placeholder="e.g. PCM-24091-B" />
            </Field>
            <Field label="Product">
              <select defaultValue="Paracetamol 500mg Tablets">
                <option>Paracetamol 500mg Tablets</option>
                <option>Amoxicillin 250mg Capsules</option>
                <option>ORS Sachets</option>
              </select>
            </Field>
            <Field label="Date discovered">
              <input type="date" />
            </Field>
            <Field label="Discovered by">
              <input type="text" placeholder="Employee name" />
            </Field>
          </Grid2>

          <SectionTitle>Classification</SectionTitle>
          <Field label="Severity">
            <PillGroup
              value={severity}
              onChange={setSeverity}
              options={[
                { value: "critical", label: "Critical", tone: "red" },
                { value: "major", label: "Major", tone: "amber" },
                { value: "minor", label: "Minor", tone: "neutral" },
              ]}
            />
          </Field>

          <SectionTitle>Description</SectionTitle>
          <Field label="What happened" fullWidth>
            <textarea placeholder="Describe the deviation from approved procedure, specification, or instruction..." />
          </Field>
          <Field label="Immediate action taken" fullWidth>
            <textarea placeholder="Containment actions taken before this report was filed..." />
          </Field>

          <SectionTitle>Root Cause (QA use)</SectionTitle>
          <Grid2>
            <Field label="Root cause category">
              <select defaultValue="">
                <option value="">— Pending investigation —</option>
                <option>Human error</option>
                <option>Equipment failure</option>
                <option>Material defect</option>
                <option>Procedure inadequate</option>
              </select>
            </Field>
            <Field label="Linked CAPA">
              <ReadonlyId value="Not yet linked" />
            </Field>
          </Grid2>

          <SectionTitle>Supporting Evidence</SectionTitle>
          <UploadBox>photos, batch record excerpts, or lab data — PDF, JPG, PNG (max 10MB each)</UploadBox>
        </PanelBody>
        <PanelActions note="Auto-saved as draft · 2 minutes ago">
          <Button variant="ghost">Save Draft</Button>
          <Button variant="primary">Submit for QA Review</Button>
        </PanelActions>
      </Panel>

      <Sidebar>
        <AuditTrailCard
          items={[
            { who: "Kwame Asante", when: "Today, 09:14", what: "Created draft record" },
            { who: "Kwame Asante", when: "Today, 09:21", what: 'Edited "Immediate action taken"' },
            { who: "System", when: "Today, 09:21", what: "Auto-saved draft (v3)" },
          ]}
        />
        <StatusRowsCard
          title="Data Integrity"
          rows={[
            { label: "Unique user session", value: "Verified" },
            { label: "Timestamp source", value: "NTP-synced" },
            { label: "Record versioning", value: "Enabled" },
          ]}
        />
        <GuidanceCard>
          Per WHO GMP Ch.11, all deviations must be logged regardless of severity. Critical deviations trigger
          automatic QA notification and may require batch quarantine.
        </GuidanceCard>
      </Sidebar>
    </div>
  );
}
