import type { ReactNode } from 'react';

/**
 * Tone classes are written out in full rather than composed at runtime —
 * Tailwind scans source text, so `bg-${tone}/10` would never be generated.
 */
export const TONE_CLASSES: Record<string, string> = {
  ok: 'bg-ok/10 text-ok border-ok/30',
  watch: 'bg-watch/10 text-watch border-watch/30',
  alert: 'bg-alert/10 text-alert border-alert/30',
  info: 'bg-info/10 text-info border-info/30',
  muted: 'bg-raised text-muted border-line',
};

export function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        TONE_CLASSES[tone] ?? TONE_CLASSES.muted
      }`}
    >
      {children}
    </span>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-line bg-surface p-4 ${className}`}>{children}</div>
  );
}

const BUTTON_VARIANTS = {
  primary: 'bg-accent text-accent-fg hover:opacity-90',
  secondary: 'bg-raised text-fg border border-line hover:border-accent/50',
  ghost: 'text-muted hover:text-fg',
  danger: 'bg-alert/10 text-alert border border-alert/30 hover:bg-alert/20',
} as const;

export function Button({
  variant = 'secondary',
  className = '',
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BUTTON_VARIANTS;
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium tracking-wide text-muted uppercase">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  'w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent';

export function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: 'accent';
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        tone === 'accent' ? 'border-accent/40 bg-accent/10' : 'border-line bg-raised'
      }`}
    >
      <div className={`text-xs ${tone === 'accent' ? 'text-accent' : 'text-muted'}`}>{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      {children ? <div className="mt-2 text-sm text-muted">{children}</div> : null}
    </div>
  );
}
