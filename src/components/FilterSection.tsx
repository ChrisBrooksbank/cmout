interface FilterSectionProps {
  label: string;
  activeCount?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function FilterSection({
  label,
  activeCount = 0,
  defaultOpen = false,
  children,
}: FilterSectionProps) {
  return (
    <details className="filter-section" open={defaultOpen || undefined}>
      <summary className="filter-section__summary">
        <span className="filter-section__label">{label}</span>
        {activeCount > 0 && <span className="filter-section__badge">{activeCount}</span>}
        <span className="filter-section__chevron" aria-hidden="true" />
      </summary>
      <div className="filter-section__body">
        <div className="filter-section__content">{children}</div>
      </div>
    </details>
  );
}
