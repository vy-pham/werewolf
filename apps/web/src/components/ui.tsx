import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

export const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-blood text-white hover:bg-red-600',
  secondary: 'bg-white/10 text-gray-100 hover:bg-white/20',
  ghost: 'bg-transparent text-gray-300 hover:bg-white/10',
  danger: 'bg-red-900/60 text-red-100 hover:bg-red-800',
};

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium text-sm transition',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl border border-white/10 bg-white/5 p-4 shadow-lg', className)}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-gray-100',
        'placeholder:text-gray-500 focus:border-moon focus:outline-none',
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: 'neutral' | 'good' | 'bad' | 'moon';
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: 'bg-white/10 text-gray-300',
    good: 'bg-green-900/60 text-green-200',
    bad: 'bg-red-900/60 text-red-200',
    moon: 'bg-amber-900/50 text-moon',
  };
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs', tones[tone], className)}>
      {children}
    </span>
  );
}

export function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-1 text-sm">
      <span className="text-gray-300">{label}</span>
      <input
        type="checkbox"
        className="size-4 accent-red-600"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
