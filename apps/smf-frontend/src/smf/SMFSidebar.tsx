import { Sidebar, AuditTrailCard, GuidanceCard } from "../shell/Sidebar";
import { CHAPTER_GUIDANCE } from "./seedData";
import type { Section } from "./DocumentNav";

export interface SMFSidebarProps {
  /** Only ever rendered for "chapter" | "annexes" | "jurisdiction" — see
   * SMFModule.tsx, which gives "export" and "history" their own full-width
   * panels instead. Typed against the full Section union anyway so the
   * caller doesn't need an unsound narrowing cast at the call site. */
  activeSection: Section;
  activeChapter: number;
}

/**
 * Audit Trail + Guidance cards transfer from the mockup almost unchanged
 * — the strongest pattern there, per the brief. Guidance is dynamic here:
 * it quotes the TRS 961 Annex 14 clause for whichever chapter is open,
 * same role the mockup's Guidance card plays for a deviation or batch
 * record, generalized to nine chapters instead of one screen.
 */
export function SMFSidebar({ activeSection, activeChapter }: SMFSidebarProps) {
  return (
    <Sidebar>
      <AuditTrailCard
        items={[
          { who: "Ama Owusu", when: "Today, 09:14", what: `Edited Chapter ${activeChapter}` },
          { who: "System", when: "Today, 09:14", what: "Auto-saved draft" },
          { who: "Kwame Asante", when: "Yesterday, 16:40", what: "Uploaded GMP certificate (Annex 3)" },
        ]}
      />
      <GuidanceCard>
        {activeSection === "chapter"
          ? CHAPTER_GUIDANCE[activeChapter]
          : activeSection === "annexes"
            ? "Per TRS 961 Annex 14 §5 (Annexes), each annex carries its own effective date and revision, independent of the parent document — updating Annex 6 alone does not require re-versioning Chapters 1–9."
            : "Ghana FDA's supplementary appendix list is sourced from an unverified secondary reference (URS §6) and is treated as an advisory checklist only until confirmed against Ghana FDA's own published guidance."}
      </GuidanceCard>
    </Sidebar>
  );
}
