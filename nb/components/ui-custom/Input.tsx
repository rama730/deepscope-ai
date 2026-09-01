import React, { useState } from "react";
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";

export type InputVariant = "default" | "filled" | "flushed";
export type InputSize = "sm" | "md" | "lg";
export type InputState = "default" | "error" | "success" | "warning";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  variant?: InputVariant;
  inputSize?: InputSize;
  state?: InputState;
  label?: string;
  helperText?: string;
  errorText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  showPasswordToggle?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = "default",
      inputSize = "md",
      state = "default",
      label,
      helperText,
      errorText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      showPasswordToggle = false,
      type = "text",
      disabled,
      className = "",
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const isPasswordInput = type === "password";
    const actualType = isPasswordInput && showPassword ? "text" : type;

    // Determine the actual state (error takes precedence)
    const actualState = errorText ? "error" : state;

    // Base wrapper styles
    const wrapperStyles = `
      ${fullWidth ? "w-full" : ""}
    `;

    // Label styles
    const labelStyles = `
      block text-sm font-medium mb-2
      text-zinc-700 dark:text-zinc-300
      ${disabled ? "opacity-50 cursor-not-allowed" : ""}
    `;

    // Input container styles
    const containerStyles = `
      relative flex items-center
      ${fullWidth ? "w-full" : ""}
    `;

    // Base input styles
    const baseInputStyles = `
      w-full font-normal
      transition-all duration-200
      focus:outline-none
      disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:bg-zinc-900 dark:disabled:bg-zinc-900
      placeholder:text-zinc-400 dark:placeholder:text-zinc-500
      ${leftIcon ? "pl-10" : ""}
      ${rightIcon || (isPasswordInput && showPasswordToggle) ? "pr-10" : ""}
    `;

    // Variant styles
    const variantStyles = {
      default: `
        border rounded-lg
        bg-white dark:bg-zinc-800
        text-zinc-900 dark:text-zinc-100
      `,
      filled: `
        border-0 rounded-lg
        bg-zinc-100 dark:bg-zinc-800
        text-zinc-900 dark:text-zinc-100
      `,
      flushed: `
        border-0 border-b-2 rounded-none
        bg-transparent
        text-zinc-900 dark:text-zinc-100
        px-0
      `,
    };

    // Size styles
    const sizeStyles = {
      sm: "text-sm px-3 py-2 min-h-[36px]",
      md: "text-sm px-4 py-2.5 min-h-[40px]",
      lg: "text-base px-4 py-3 min-h-[44px]",
    };

    // State styles (border colors and focus rings)
    const stateStyles = {
      default: `
        border-zinc-300 dark:border-zinc-700
        focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
      `,
      error: `
        border-red-300 dark:border-red-700
        focus:border-red-500 focus:ring-2 focus:ring-red-500/20
      `,
      success: `
        border-green-300 dark:border-green-700
        focus:border-green-500 focus:ring-2 focus:ring-green-500/20
      `,
      warning: `
        border-yellow-300 dark:border-yellow-700
        focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20
      `,
    };

    // Icon styles
    const iconContainerStyles = `
      absolute top-1/2 -translate-y-1/2
      flex items-center justify-center
      pointer-events-none
      text-zinc-500 dark:text-zinc-400
    `;

    const leftIconStyles = `${iconContainerStyles} left-3`;
    const rightIconStyles = `${iconContainerStyles} right-3`;

    // Helper/Error text styles
    const helperTextStyles = `
      mt-1.5 text-xs
      ${actualState === "error" ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400"}
    `;

    // State icon
    const getStateIcon = () => {
      if (actualState === "error") {
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      }
      if (actualState === "success") {
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      }
      return null;
    };

    const stateIcon = getStateIcon();

    return (
      <div className={wrapperStyles}>
        {label && (
          <label htmlFor={inputId} className={labelStyles}>
            {label}
          </label>
        )}
        
        <div className={containerStyles}>
          {/* Left Icon */}
          {leftIcon && (
            <div className={leftIconStyles}>
              {leftIcon}
            </div>
          )}

          {/* Input Field */}
          <input
            ref={ref}
            id={inputId}
            type={actualType}
            disabled={disabled}
            className={`
              ${baseInputStyles}
              ${variantStyles[variant]}
              ${sizeStyles[inputSize]}
              ${variant !== "flushed" ? stateStyles[actualState] : ""}
              ${variant === "flushed" ? `border-zinc-300 dark:border-zinc-700 focus:border-indigo-500` : ""}
              ${className}
            `}
            {...props}
          />

          {/* Right Icon or State Icon or Password Toggle */}
          {(rightIcon || stateIcon || (isPasswordInput && showPasswordToggle)) && (
            <div className={rightIconStyles}>
              {isPasswordInput && showPasswordToggle ? (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="pointer-events-auto p-1 rounded hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-700 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              ) : stateIcon ? (
                stateIcon
              ) : (
                rightIcon
              )}
            </div>
          )}
        </div>

        {/* Helper or Error Text */}
        {(helperText || errorText) && (
          <p className={helperTextStyles}>
            {errorText || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;


