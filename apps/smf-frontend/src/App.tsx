import { useState } from "react";
import { Rail } from "./shell/Rail";
import { TopBar, Tabs } from "./shell/TopBar";
import { DeviationReportDemo } from "./demo/DeviationReportDemo";
import { BatchRecordDemo } from "./demo/BatchRecordDemo";
import { SMFModule, type SmfRole } from "./smf/SMFModule";

type ModuleKey = "deviations" | "batch" | "smf";

const MODULE_TOPBAR: Record<ModuleKey, { title: string; breadcrumb: string }> = {
  deviations: { title: "New Submission", breadcrumb: "Danadams Pharmaceutical Ind. Ltd / Quality / New Record" },
  batch: { title: "New Submission", breadcrumb: "Danadams Pharmaceutical Ind. Ltd / Quality / New Record" },
  smf: { title: "Site Master File", breadcrumb: "Danadams Pharmaceutical Ind. Ltd / Quality / Site Master File" },
};

const SMF_ROLE_OPTIONS: { value: SmfRole; label: string }[] = [
  { value: "factory_user", label: "Factory User" },
  { value: "inspector", label: "Ghana FDA Inspector" },
];

/**
 * The rail is real navigation here, not a static mockup: selecting
 * "Site Master File" swaps the main view to the SMF module (the actual
 * schema-driven renderer, wired to template.json), while "Deviations" /
 * "Batch Records" keep the shell-fidelity demo screens that reproduce
 * the mockup's own two record types. Same shell, same tokens, three
 * different content types — proving the shell isn't SMF-specific.
 */
export function App() {
  const [activeModule, setActiveModule] = useState<ModuleKey>("smf");
  const [activeTab, setActiveTab] = useState<"deviation" | "batch">("deviation");
  const [smfRole, setSmfRole] = useState<SmfRole>("factory_user");

  const topbar = MODULE_TOPBAR[activeModule];

  return (
    <div className="shell">
      <Rail
        brandMark="GxP Console"
        brandSub="Ghana FDA · GMP Compliance Platform"
        navItems={[
          // Dashboard and everything after Site Master File are other GMP
          // domains the URS explicitly scopes out of this phase (Section
          // 11: "will be delivered under separate URS documents in later
          // phases") — disabled rather than dead href="#" links, so the
          // scope boundary reads as a boundary, not a bug.
          { key: "dashboard", label: "Dashboard", href: "#", disabled: true },
          { key: "deviations", label: "Deviations", href: "#", active: activeModule === "deviations" },
          { key: "batch", label: "Batch Records", href: "#", active: activeModule === "batch" },
          { key: "smf", label: "Site Master File", href: "#", active: activeModule === "smf" },
          { key: "capa", label: "CAPA", href: "#", disabled: true },
          { key: "documents", label: "Documents", href: "#", disabled: true },
          { key: "equipment", label: "Equipment", href: "#", disabled: true },
          { key: "training", label: "Training", href: "#", disabled: true },
          { key: "recalls", label: "Recalls", href: "#", disabled: true },
          { key: "self-inspection", label: "Self-Inspection", href: "#", disabled: true },
        ].map((item) => ({
          ...item,
          onSelect: () => {
            if (item.key === "deviations" || item.key === "batch" || item.key === "smf") setActiveModule(item.key);
          },
        }))}
        facilityName="Danadams Pharmaceutical Ind. Ltd"
        facilityLine="License GH-MFG-0142 · Kumasi"
        demoNote={
          typeof __DEMO_BUILD__ !== "undefined" && __DEMO_BUILD__
            ? "Prototype preview — mocked backend, no real data"
            : undefined
        }
      />
      <div className="main">
        <TopBar
          title={topbar.title}
          breadcrumb={topbar.breadcrumb}
          roleLabel="Factory User"
          avatarInitials={smfRole === "inspector" && activeModule === "smf" ? "GH" : "AO"}
          roleOptions={activeModule === "smf" ? SMF_ROLE_OPTIONS : undefined}
          roleValue={activeModule === "smf" ? smfRole : undefined}
          onRoleChange={activeModule === "smf" ? (v) => setSmfRole(v as SmfRole) : undefined}
        />
        {activeModule !== "smf" && (
          <Tabs
            activeKey={activeTab}
            onChange={(k) => setActiveTab(k as "deviation" | "batch")}
            items={[
              { key: "deviation", label: "Deviation Report" },
              { key: "batch", label: "Batch Record" },
            ]}
          />
        )}
        {activeModule === "smf" ? <SMFModule role={smfRole} /> : activeTab === "deviation" ? <DeviationReportDemo /> : <BatchRecordDemo />}
      </div>
    </div>
  );
}
