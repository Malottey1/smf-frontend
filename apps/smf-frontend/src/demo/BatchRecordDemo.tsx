import { Panel, PanelHeader, PanelBody, PanelActions } from "../shell/Panel";
import { Stepper } from "../shell/Stepper";
import { SectionTitle, Grid2, Field, ReadonlyId, UploadBox, Button } from "../shell/Fields";
import { Sidebar, AuditTrailCard, GuidanceCard, TextCard } from "../shell/Sidebar";

/** Reproduces the mockup's Batch Manufacturing Record tab, same components as DeviationReportDemo. */
export function BatchRecordDemo() {
  return (
    <div className="content">
      <Panel>
        <PanelHeader title="Batch Manufacturing Record" identifier="BMR-2026-00842" />
        <Stepper
          steps={[
            { key: "dispensing", label: "Dispensing", status: "done" },
            { key: "processing", label: "Processing", status: "done" },
            { key: "packaging", label: "Packaging", status: "current" },
            { key: "qa", label: "QA Release", status: "upcoming" },
          ]}
        />
        <PanelBody>
          <SectionTitle>Batch Identification</SectionTitle>
          <Grid2>
            <Field label="Product">
              <select defaultValue="Paracetamol 500mg Tablets">
                <option>Paracetamol 500mg Tablets</option>
              </select>
            </Field>
            <Field label="Batch number">
              <ReadonlyId value="PCM-24091-B" />
            </Field>
            <Field label="Manufacturing date">
              <input type="date" defaultValue="2026-09-01" />
            </Field>
            <Field label="Expiry date">
              <input type="date" defaultValue="2028-09-01" />
            </Field>
          </Grid2>

          <SectionTitle>In-Process Controls — Packaging</SectionTitle>
          <Grid2>
            <Field label="Line clearance checklist">
              <select defaultValue="Completed — QA verified">
                <option>Completed — QA verified</option>
                <option>Pending</option>
              </select>
            </Field>
            <Field label="Blister fill weight check">
              <input type="text" placeholder="e.g. 4.98g avg (spec 4.9–5.1g)" />
            </Field>
            <Field label="Leak test result">
              <select defaultValue="Pass">
                <option>Pass</option>
                <option>Fail</option>
              </select>
            </Field>
            <Field label="Carton count reconciliation">
              <input type="text" placeholder="Units in = Units out + rejects" />
            </Field>
          </Grid2>

          <SectionTitle>Yield Reconciliation</SectionTitle>
          <Grid2>
            <Field label="Theoretical yield">
              <input type="text" placeholder="e.g. 100,000 tablets" />
            </Field>
            <Field label="Actual yield">
              <input type="text" placeholder="e.g. 99,420 tablets" />
            </Field>
          </Grid2>

          <SectionTitle>Executed Record</SectionTitle>
          <UploadBox>signed paper BMR scan or e-BMR export — PDF only</UploadBox>
        </PanelBody>
        <PanelActions note="Stage 3 of 4 · Packaging supervisor sign-off pending">
          <Button variant="ghost">Save Progress</Button>
          <Button variant="primary">Sign &amp; Advance to QA Release</Button>
        </PanelActions>
      </Panel>

      <Sidebar>
        <AuditTrailCard
          items={[
            { who: "Ama Owusu", when: "Sep 1, 14:02", what: "Completed dispensing stage" },
            { who: "Yaw Boateng", when: "Sep 2, 08:40", what: "Signed processing stage" },
            { who: "Kwame Asante", when: "Today, 10:05", what: "Entered packaging IPC data" },
          ]}
        />
        <TextCard title="Batch Genealogy">
          Linked to 3 raw material lots (API-2209, EXC-1187, EXC-1204) and 1 packaging component lot (BLS-0067).
        </TextCard>
        <GuidanceCard>
          Per WHO GMP Ch.14, each processing step requires operator initials and date at time of execution —
          retrospective entry is not permitted.
        </GuidanceCard>
      </Sidebar>
    </div>
  );
}
