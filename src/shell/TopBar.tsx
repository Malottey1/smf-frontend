export interface RoleOption {
  value: string;
  label: string;
}

export interface TopBarProps {
  title: string;
  breadcrumb: string;
  roleLabel: string;
  avatarInitials: string;
  /** When provided (with onRoleChange), the role badge becomes a real
   * switcher instead of a static label — used by the SMF module to
   * demonstrate the Inspector persona (FR-SMF-08) without a real login.
   * Demo screens that don't pass these keep the mockup's plain badge. */
  roleOptions?: RoleOption[];
  roleValue?: string;
  onRoleChange?: (value: string) => void;
}

/** Top bar — structure ported unchanged from the mockup; the role badge
 * optionally becomes an interactive switcher (see roleOptions above). */
export function TopBar({ title, breadcrumb, roleLabel, avatarInitials, roleOptions, roleValue, onRoleChange }: TopBarProps) {
  return (
    <div className="topbar">
      <div>
        <h1>{title}</h1>
        <div className="crumb">{breadcrumb}</div>
      </div>
      <div className="topbar-right">
        {roleOptions && onRoleChange ? (
          <select className="badge-role badge-role-select" value={roleValue} onChange={(e) => onRoleChange(e.target.value)} aria-label="Viewing as">
            {roleOptions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="badge-role">{roleLabel}</span>
        )}
        <div className="avatar">{avatarInitials}</div>
      </div>
    </div>
  );
}

export interface TabItem {
  key: string;
  label: string;
}

export interface TabsProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

/**
 * Tab bar — ported unchanged from the mockup, and used the same way here:
 * to switch between platform record/module types (Deviation Report, Batch
 * Record, …). Per the brief, SMF's own chapter switching does NOT use
 * this component — a document nav column handles that instead, since nine
 * chapters with sub-clauses won't fit a tab bar and this component was
 * never meant for sections of one record.
 */
export function Tabs({ items, activeKey, onChange }: TabsProps) {
  return (
    <div className="tabs">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={item.key === activeKey ? "tab-btn active" : "tab-btn"}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
