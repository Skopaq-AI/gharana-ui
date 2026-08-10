import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

/**
  Standardized Page Header Banner across all tab feature screens
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  icon: Icon,
  title,
  description,
  badge,
  action,
  children
}) => {
  return (
    <div className="p-6 rounded-2xl bg-[#120e1b] border border-[#241c33] shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#f2542d]/10 border border-[#f2542d]/30 text-[#f2542d] flex-shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-xl font-bold text-[#f5efe6]">
                {title}
              </h1>
              {badge && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#ffd48a]/10 text-[#ffd48a] border border-[#ffd48a]/30 font-mono text-[10px] font-bold">
                  {badge}
                </span>
              )}
            </div>
          </div>
          <p className="font-mono text-xs text-[#a294b8] pl-10">
            {description}
          </p>
        </div>

        {action && <div className="flex items-center gap-2 flex-shrink-0">{action}</div>}
      </div>

      {children && <div className="pt-3 border-t border-[#241c33]">{children}</div>}
    </div>
  );
};

interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Standardized Card Container with identical padding, border-radius, background, and borders
 */
export const SectionCard: React.FC<SectionCardProps> = ({ children, className = '' }) => {
  return (
    <div className={`p-6 rounded-2xl bg-[#120e1b] border border-[#241c33] shadow-md ${className}`}>
      {children}
    </div>
  );
};

export const SectionPanel = SectionCard;

interface SectionHeaderProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  iconColorClass?: string;
}

/**
 * Standardized Section Title inside cards
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon: Icon,
  title,
  subtitle,
  action,
  iconColorClass = 'text-[#ffd48a]'
}) => {
  return (
    <div className="flex items-center justify-between pb-3 border-b border-[#241c33]">
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <div className={`p-2 rounded-xl bg-[#08060d] border border-[#241c33] ${iconColorClass}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div className="truncate">
          <h3 className="font-serif text-base font-bold text-[#f5efe6] truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="font-mono text-[11px] text-[#a294b8] truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  valueColorClass?: string;
  icon?: LucideIcon;
}

/**
 * Standardized Metric Stat Box
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  valueColorClass = 'text-[#f5efe6]',
  icon: Icon
}) => {
  return (
    <div className="p-4 rounded-2xl bg-[#08060d] border border-[#241c33] space-y-1">
      <div className="flex items-center justify-between text-[#a294b8] font-mono text-[10px] uppercase tracking-wider">
        <span>{label}</span>
        {Icon && <Icon className="w-3.5 h-3.5 text-[#a294b8]" />}
      </div>
      <div className={`text-lg font-bold font-mono ${valueColorClass}`}>
        {value}
      </div>
      {subtext && (
        <span className="text-[10px] font-mono text-[#6d6183] block truncate">
          {subtext}
        </span>
      )}
    </div>
  );
};
