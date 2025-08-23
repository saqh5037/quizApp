import React, { forwardRef, useRef, MouseEvent } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { RiLoader4Line } from 'react-icons/ri';
import clsx from 'clsx';

/**
 * Button component with Socrative design system
 * Fully accessible with ARIA attributes and keyboard navigation
 */

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, 'size'> {
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost';
  /** Button size */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Full width button */
  fullWidth?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Icon on the left side */
  leftIcon?: React.ReactNode;
  /** Icon on the right side */
  rightIcon?: React.ReactNode;
  /** Button content */
  children: React.ReactNode;
  /** HTML button type */
  type?: 'button' | 'submit' | 'reset';
  /** Additional CSS classes */
  className?: string;
  /** Ripple effect on click */
  ripple?: boolean;
  /** Rounded style */
  rounded?: boolean;
  /** ARIA label for accessibility */
  ariaLabel?: string;
}

interface RippleProps {
  x: number;
  y: number;
  size: number;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      children,
      type = 'button',
      className,
      ripple = true,
      rounded = false,
      ariaLabel,
      onClick,
      ...rest
    },
    ref
  ) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [ripples, setRipples] = React.useState<RippleProps[]>([]);

    // Combine refs
    React.useImperativeHandle(ref, () => buttonRef.current!);

    // Handle ripple effect
    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      if (ripple && !disabled && !loading) {
        const button = buttonRef.current;
        if (button) {
          const rect = button.getBoundingClientRect();
          const size = Math.max(rect.width, rect.height);
          const x = e.clientX - rect.left - size / 2;
          const y = e.clientY - rect.top - size / 2;

          const newRipple = { x, y, size };
          setRipples((prev) => [...prev, newRipple]);

          // Remove ripple after animation
          setTimeout(() => {
            setRipples((prev) => prev.slice(1));
          }, 600);
        }
      }

      // Call original onClick
      if (onClick && !disabled && !loading) {
        onClick(e as any);
      }
    };

    // Base classes
    const baseClasses = clsx(
      'relative inline-flex items-center justify-center',
      'font-medium tracking-wide',
      'transition-all duration-250 ease-out',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
      'select-none overflow-hidden',
      {
        'w-full': fullWidth,
        'rounded-full': rounded,
        'rounded-md': !rounded,
      }
    );

    // Variant classes
    const variantClasses = {
      primary: clsx(
        'bg-primary text-white',
        'hover:bg-primary-dark hover:shadow-md',
        'active:scale-[0.98]',
        'focus-visible:ring-primary'
      ),
      secondary: clsx(
        'bg-transparent text-primary',
        'border-2 border-primary',
        'hover:bg-primary hover:text-white hover:shadow-md',
        'active:scale-[0.98]',
        'focus-visible:ring-primary'
      ),
      success: clsx(
        'bg-success text-white',
        'hover:bg-success/90 hover:shadow-md',
        'active:scale-[0.98]',
        'focus-visible:ring-success'
      ),
      danger: clsx(
        'bg-error text-white',
        'hover:bg-error/90 hover:shadow-md',
        'active:scale-[0.98]',
        'focus-visible:ring-error'
      ),
      warning: clsx(
        'bg-warning text-white',
        'hover:bg-warning/90 hover:shadow-md',
        'active:scale-[0.98]',
        'focus-visible:ring-warning'
      ),
      ghost: clsx(
        'bg-transparent text-text-primary',
        'hover:bg-surface-variant',
        'active:scale-[0.98]',
        'focus-visible:ring-text-secondary'
      ),
    };

    // Size classes
    const sizeClasses = {
      sm: 'text-sm px-3 py-1.5 h-8 min-w-[64px]',
      md: 'text-base px-4 py-2 h-10 min-w-[80px]',
      lg: 'text-lg px-6 py-3 h-12 min-w-[96px]',
      xl: 'text-xl px-8 py-4 h-14 min-w-[112px]',
    };

    // Loading spinner size
    const spinnerSize = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
      xl: 'w-6 h-6',
    };

    // Icon spacing
    const iconSpacing = {
      sm: 'gap-1.5',
      md: 'gap-2',
      lg: 'gap-2.5',
      xl: 'gap-3',
    };

    const buttonClasses = clsx(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      iconSpacing[size],
      className
    );

    // Animation variants for Framer Motion
    const buttonVariants = {
      idle: { scale: 1 },
      tap: { scale: 0.98 },
      hover: { scale: 1.02 },
    };

    return (
      <motion.button
        ref={buttonRef}
        type={type}
        className={buttonClasses}
        disabled={disabled || loading}
        onClick={handleClick}
        variants={buttonVariants}
        whileTap={!disabled && !loading ? 'tap' : undefined}
        whileHover={!disabled && !loading ? 'hover' : undefined}
        aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
        aria-disabled={disabled}
        aria-busy={loading}
        {...rest}
      >
        {/* Ripple effects container */}
        {ripple && ripples.map((ripple, index) => (
          <motion.span
            key={index}
            className="absolute bg-white/30 rounded-full pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        ))}

        {/* Loading spinner or left icon */}
        {loading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <RiLoader4Line className={clsx('animate-spin', spinnerSize[size])} />
          </motion.div>
        ) : leftIcon ? (
          <span className="flex-shrink-0">{leftIcon}</span>
        ) : null}

        {/* Button content */}
        <span className={clsx('truncate', { 'opacity-0': loading && !leftIcon && !rightIcon })}>
          {children}
        </span>

        {/* Right icon */}
        {rightIcon && !loading && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

// Export variants for use in other components
export const buttonVariants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  success: 'btn-success',
  danger: 'btn-danger',
  warning: 'btn-warning',
  ghost: 'btn-ghost',
};

export const buttonSizes = {
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
  xl: 'btn-xl',
};

export default Button;