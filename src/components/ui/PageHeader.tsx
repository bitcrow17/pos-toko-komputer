import {
  PAGE_SUBTITLE,
  PAGE_TITLE,
} from "@/lib/ui-classes";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  actions,
  badge,
}: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className={PAGE_TITLE}>{title}</h1>
          {badge}
        </div>
        {subtitle && <p className={PAGE_SUBTITLE}>{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export { PAGE_TITLE, PAGE_SUBTITLE };
