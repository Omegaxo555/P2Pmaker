import React from 'react';
import { cn } from '@/lib/utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'brand' | 'neutral';
  className?: string;
}

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  const variantStyles = {
    success: 'bg-success/15 text-success border-success/30',
    danger: 'bg-danger/15 text-danger border-danger/30',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    brand: 'bg-brand/15 text-brand border-brand/30',
    neutral: 'bg-surface-600 text-muted border-surface-500',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide uppercase',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
