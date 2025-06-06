"use client";

import { cn } from '@/utils/cn';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary-500 text-white hover:bg-primary-600",
        secondary: "border-transparent bg-secondary-100 text-secondary-900 hover:bg-secondary-200",
        destructive: "border-transparent bg-red-500 text-white hover:bg-red-600",
        outline: "border-neutral-200 text-secondary-900",
        success: "border-transparent bg-green-500 text-white hover:bg-green-600",
        warning: "border-transparent bg-yellow-500 text-white hover:bg-yellow-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
