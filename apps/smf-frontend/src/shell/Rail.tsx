export interface RailNavItem {
  key: string;
  label: string;
  href: string;
  active?: boolean;
  onSelect?: () => void;
  /** Modules the URS scopes out of this phase (Section 11: "other GMP
   * domains... will be delivered under separate URS documents in later
   * phases"). Rendered as visibly inert rather than a dead `href="#"`
   * link — a link that silently does nothing reads as a bug, not a
   * scope boundary. */
  disabled?: boolean;
}

export interface RailProps {
  brandMark: string;
  brandSub: string;
  navItems: RailNavItem[];
  facilityName: string;
  facilityLine: string;
  /** Shown as a small footnote at the base of the rail when set — for a
   * shared demo/preview build, so anyone it's shared with knows they're
   * looking at a frontend prototype against a mocked backend, not a
   * connected system. Omitted (undefined) in a real deployment. */
  demoNote?: string;
}

/**
 * Left rail — ported unchanged from the mockup. "Site Master File" is a
 * new nav entry (the mockup's rail predates this module); placed after
 * "Batch Records" as a judgment call, not a confirmed product IA decision
 * — see DECISIONS.md.
 */
export function Rail({ brandMark, brandSub, navItems, facilityName, facilityLine, demoNote }: RailProps) {
  return (
    <aside className="rail">
      <div className="rail-brand">
        <div className="mark">{brandMark}</div>
        <div className="sub">{brandSub}</div>
      </div>
      <nav className="rail-nav">
        {navItems.map((item) =>
          item.disabled ? (
            <span
              key={item.key}
              className="rail-nav-disabled"
              aria-disabled="true"
              title="Not part of this phase — see the platform-wide requirements spec"
            >
              <span className="dot" />
              {item.label}
              <span className="rail-nav-phase-tag">Later phase</span>
            </span>
          ) : (
            <a
              key={item.key}
              href={item.href}
              className={item.active ? "active" : undefined}
              onClick={(e) => {
                if (item.onSelect) {
                  e.preventDefault();
                  item.onSelect();
                }
              }}
            >
              <span className="dot" />
              {item.label}
            </a>
          ),
        )}
      </nav>
      <div className="rail-facility">
        <div className="name">{facilityName}</div>
        <div>{facilityLine}</div>
      </div>
      {demoNote && <div className="rail-demo-note">{demoNote}</div>}
    </aside>
  );
}
