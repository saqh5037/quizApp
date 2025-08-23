import React, { forwardRef, useState, useCallback, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiEyeLine,
  RiEyeOffLine,
  RiErrorWarningLine,
  RiCheckLine,
  RiInformationLine,
} from 'react-icons/ri';
import clsx from 'clsx';

/**
 * Input component with Socrative design system
 * Supports various types, validation, and accessibility features
 */

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input label */
  label?: string;
  /** Helper text below input */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Success message */
  success?: string;
  /** Input size variant */
  inputSize?: 'sm' | 'md' | 'lg';
  /** Full width input */
  fullWidth?: boolean;
  /** Icon on the left side */
  leftIcon?: React.ReactNode;
  /** Icon on the right side */
  rightIcon?: React.ReactNode;
  /** Show character counter */
  showCounter?: boolean;
  /** Input variant */
  variant?: 'outlined' | 'filled' | 'ghost';
  /** Loading state */
  loading?: boolean;
  /** Custom mask function */
  mask?: (value: string) => string;
  /** Format display value */
  formatDisplay?: (value: string) => string;
  /** Validate on blur */
  validateOnBlur?: boolean;
  /** Custom validation function */
  validate?: (value: string) => string | null;
  /** Animated label */
  floatingLabel?: boolean;
  /** Additional container className */
  containerClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      success,
      inputSize = 'md',
      fullWidth = false,
      leftIcon,
      rightIcon,
      showCounter = false,
      variant = 'outlined',
      loading = false,
      mask,
      formatDisplay,
      validateOnBlur = false,
      validate,
      floatingLabel = false,
      containerClassName,
      className,
      type = 'text',
      disabled = false,
      maxLength,
      value: propValue,
      onChange,
      onBlur,
      id,
      ...rest
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [internalValue, setInternalValue] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);

    // Use prop value or internal value
    const value = propValue !== undefined ? propValue : internalValue;
    const hasValue = Boolean(value && String(value).length > 0);

    // Generate ID if not provided
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    // Handle input change
    const handleChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        let newValue = e.target.value;

        // Apply mask if provided
        if (mask) {
          newValue = mask(newValue);
        }

        // Update internal value if not controlled
        if (propValue === undefined) {
          setInternalValue(newValue);
        }

        // Clear validation error on change
        if (validationError) {
          setValidationError(null);
        }

        // Call onChange prop
        if (onChange) {
          e.target.value = newValue;
          onChange(e);
        }
      },
      [mask, onChange, propValue, validationError]
    );

    // Handle blur event
    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);

        // Validate on blur if enabled
        if (validateOnBlur && validate) {
          const error = validate(e.target.value);
          setValidationError(error);
        }

        if (onBlur) {
          onBlur(e);
        }
      },
      [validateOnBlur, validate, onBlur]
    );

    // Toggle password visibility
    const togglePasswordVisibility = useCallback(() => {
      setShowPassword((prev) => !prev);
    }, []);

    // Determine input type
    const inputType = type === 'password' && showPassword ? 'text' : type;

    // Display value (formatted if formatter provided)
    const displayValue = formatDisplay && !isFocused ? formatDisplay(String(value)) : value;

    // Error state (prop error or validation error)
    const hasError = Boolean(error || validationError);
    const errorMessage = error || validationError;

    // Base container classes
    const containerClasses = clsx(
      'relative',
      {
        'w-full': fullWidth,
        'opacity-50 cursor-not-allowed': disabled,
      },
      containerClassName
    );

    // Input wrapper classes
    const wrapperClasses = clsx(
      'relative flex items-center',
      'transition-all duration-250',
      'group'
    );

    // Base input classes
    const baseInputClasses = clsx(
      'w-full bg-transparent',
      'transition-all duration-250',
      'placeholder-text-secondary',
      'focus:outline-none',
      'disabled:cursor-not-allowed disabled:opacity-50',
      {
        // Padding for icons
        'pl-10': leftIcon,
        'pr-10': rightIcon || type === 'password',
      }
    );

    // Variant classes
    const variantClasses = {
      outlined: clsx(
        'border rounded-md',
        {
          'border-border hover:border-text-secondary': !hasError && !success,
          'border-error': hasError,
          'border-success': success && !hasError,
          'focus:border-primary focus:ring-2 focus:ring-primary/20': !hasError && !success,
          'focus:border-error focus:ring-2 focus:ring-error/20': hasError,
          'focus:border-success focus:ring-2 focus:ring-success/20': success && !hasError,
        }
      ),
      filled: clsx(
        'bg-surface-variant rounded-md border-b-2',
        {
          'border-transparent hover:bg-border/20': !hasError && !success,
          'border-error bg-error/5': hasError,
          'border-success bg-success/5': success && !hasError,
          'focus:bg-primary/5 focus:border-primary': !hasError && !success,
        }
      ),
      ghost: clsx(
        'border-b-2',
        {
          'border-border hover:border-text-secondary': !hasError && !success,
          'border-error': hasError,
          'border-success': success && !hasError,
          'focus:border-primary': !hasError && !success,
        }
      ),
    };

    // Size classes
    const sizeClasses = {
      sm: clsx('text-sm', {
        'px-3 py-1.5': variant !== 'ghost',
        'py-1': variant === 'ghost',
      }),
      md: clsx('text-base', {
        'px-4 py-2': variant !== 'ghost',
        'py-1.5': variant === 'ghost',
      }),
      lg: clsx('text-lg', {
        'px-5 py-3': variant !== 'ghost',
        'py-2': variant === 'ghost',
      }),
    };

    const inputClasses = clsx(
      baseInputClasses,
      variantClasses[variant],
      sizeClasses[inputSize],
      className
    );

    // Label classes for floating label
    const labelClasses = clsx(
      'block font-medium mb-1.5',
      {
        'text-sm': inputSize === 'sm',
        'text-base': inputSize === 'md',
        'text-lg': inputSize === 'lg',
        'text-error': hasError,
        'text-success': success && !hasError,
        'text-text-primary': !hasError && !success,
      }
    );

    // Floating label classes
    const floatingLabelClasses = clsx(
      'absolute left-4 transition-all duration-250 pointer-events-none',
      'bg-surface px-1',
      {
        'text-sm top-2': inputSize === 'sm',
        'text-base top-2.5': inputSize === 'md',
        'text-lg top-3': inputSize === 'lg',
        'transform -translate-y-6 scale-75 text-primary': isFocused || hasValue,
        'text-text-secondary': !isFocused && !hasValue,
        'text-error': hasError,
        'text-success': success && !hasError,
      }
    );

    return (
      <div className={containerClasses}>
        {/* Regular label */}
        {label && !floatingLabel && (
          <label htmlFor={inputId} className={labelClasses}>
            {label}
          </label>
        )}

        {/* Input wrapper */}
        <div className={wrapperClasses}>
          {/* Left icon */}
          {leftIcon && (
            <div className="absolute left-3 text-text-secondary pointer-events-none">
              {leftIcon}
            </div>
          )}

          {/* Input field */}
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={inputClasses}
            value={displayValue}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            disabled={disabled || loading}
            maxLength={maxLength}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...rest}
          />

          {/* Floating label */}
          {label && floatingLabel && (
            <label htmlFor={inputId} className={floatingLabelClasses}>
              {label}
            </label>
          )}

          {/* Right icon / Password toggle / Status icon */}
          <div className="absolute right-3 flex items-center gap-2">
            {/* Password visibility toggle */}
            {type === 'password' && (
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="text-text-secondary hover:text-text-primary transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <RiEyeOffLine /> : <RiEyeLine />}
              </button>
            )}

            {/* Status icons */}
            {hasError && !rightIcon && (
              <RiErrorWarningLine className="text-error" />
            )}
            {success && !hasError && !rightIcon && (
              <RiCheckLine className="text-success" />
            )}

            {/* Custom right icon */}
            {rightIcon && !type.includes('password') && (
              <div className="text-text-secondary">{rightIcon}</div>
            )}

            {/* Loading spinner */}
            {loading && (
              <div className="animate-spin">
                <RiLoader4Line className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>

        {/* Helper text / Error message / Character counter */}
        <AnimatePresence mode="wait">
          {(errorMessage || helperText || showCounter) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mt-1.5 flex items-start justify-between gap-2"
            >
              {/* Error or helper text */}
              <div className="flex items-start gap-1">
                {hasError && (
                  <RiErrorWarningLine className="text-error mt-0.5 flex-shrink-0" size={14} />
                )}
                {success && !hasError && (
                  <RiCheckLine className="text-success mt-0.5 flex-shrink-0" size={14} />
                )}
                {helperText && !hasError && !success && (
                  <RiInformationLine className="text-text-secondary mt-0.5 flex-shrink-0" size={14} />
                )}
                <span
                  id={hasError ? `${inputId}-error` : `${inputId}-helper`}
                  className={clsx('text-sm', {
                    'text-error': hasError,
                    'text-success': success && !hasError,
                    'text-text-secondary': !hasError && !success,
                  })}
                >
                  {errorMessage || helperText}
                </span>
              </div>

              {/* Character counter */}
              {showCounter && maxLength && (
                <span
                  className={clsx('text-sm', {
                    'text-error': String(value).length > maxLength,
                    'text-warning': String(value).length > maxLength * 0.9,
                    'text-text-secondary': String(value).length <= maxLength * 0.9,
                  })}
                >
                  {String(value).length}/{maxLength}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

Input.displayName = 'Input';

// Mask utilities
export const masks = {
  phone: (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  },
  creditCard: (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const groups = numbers.match(/.{1,4}/g) || [];
    return groups.join(' ').substr(0, 19);
  },
  date: (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  },
  sessionCode: (value: string) => {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '').substr(0, 6);
  },
};

export default Input;