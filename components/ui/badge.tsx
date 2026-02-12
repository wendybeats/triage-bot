import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary-500/20 text-primary-300',
        tier_1: 'bg-priority-high/20 text-red-300',
        tier_2: 'bg-priority-medium/20 text-yellow-300',
        low_priority: 'bg-priority-low/20 text-green-300',
        source: 'bg-dark-border text-dark-text',
        status_new: 'bg-blue-500/20 text-blue-300',
        status_in_progress: 'bg-yellow-500/20 text-yellow-300',
        status_done: 'bg-green-500/20 text-green-300',
        status_deferred: 'bg-gray-500/20 text-gray-300',
        escalation: 'bg-red-500/20 text-red-300 animate-pulse',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
