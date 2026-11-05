import React from 'react';
import { cn } from '@/lib/utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface-800 border border-surface-600 rounded-xl p-5 shadow-lg shadow-black/20',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

