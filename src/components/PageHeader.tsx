interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional actions rendered on the right side of the header (buttons, badges, etc.). */
  actions?: React.ReactNode;
}

/**
 * Standard page header used across all manager pages.
 * Keeps titles, descriptions, and right-aligned actions visually consistent.
 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
