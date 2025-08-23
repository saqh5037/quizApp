import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import clsx from 'clsx';

export interface CardProps extends HTMLMotionProps<"div"> {
  variant?: 'flat' | 'elevated' | 'outlined';
  hover?: boolean;
  clickable?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'elevated', hover = false, clickable = false, loading = false, children, className, ...rest }, ref) => {
    const cardClasses = clsx(
      'bg-surface rounded-lg transition-all duration-250',
      {
        'shadow-sm': variant === 'flat',
        'shadow-md': variant === 'elevated',
        'border border-border': variant === 'outlined',
        'hover:shadow-lg hover:-translate-y-1': hover,
        'cursor-pointer active:scale-[0.99]': clickable,
        'animate-pulse': loading,
      },
      className
    );

    return (
      <motion.div
        ref={ref}
        className={cardClasses}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        {...rest}
      >
        {loading ? (
          <div className="space-y-4 p-6">
            <div className="h-4 bg-surface-variant rounded w-3/4"></div>
            <div className="h-4 bg-surface-variant rounded"></div>
            <div className="h-4 bg-surface-variant rounded w-5/6"></div>
          </div>
        ) : (
          children
        )}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

export default Card;