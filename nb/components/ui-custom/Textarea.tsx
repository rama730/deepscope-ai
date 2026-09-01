import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export type TextareaVariant = "default" | "filled";
export type TextareaSize = "sm" | "md" | "lg";
export type TextareaState = "default" | "error" | "success" | "warning";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: TextareaVariant;
  textareaSize?: TextareaSize;
  state?: TextareaState;
  label?: string;
  helperText?: string;
  errorText?: string;
  fullWidth?: boolean;
  showCharCount?: boolean;
  maxLength?: number;
  resize?: "none" | "vertical" | "horizontal" | "both";
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      variant = "default",
      textareaSize = "md",
      state = "default",
      label,
      helperText,
      errorText,
      fullWidth = false,
      showCharCount = false,
      maxLength,
      resize = "vertical",
      disabled,
      className = "",
      id,
      value,
      ...props
    },
    ref
  ) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    // Determine the actual state (error takes precedence)
    const actualState = errorText ? "error" : state;

    // Calculate character count
    const charCount = typeof value === "string" ? value.length : 0;

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

    // Base textarea styles
    const baseTextareaStyles = `
      w-full font-normal
      transition-all duration-200
      focus:outline-none
      disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:bg-zinc-900 dark:disabled:bg-zinc-900
      placeholder:text-zinc-400 dark:placeholder:text-zinc-500
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
    };

    // Size styles
    const sizeStyles = {
      sm: "text-sm px-3 py-2",
      md: "text-sm px-4 py-2.5",
      lg: "text-base px-4 py-3",
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

    // Resize styles
    const resizeStyles = {
      none: "resize-none",
      vertical: "resize-y",
      horizontal: "resize-x",
      both: "resize",
    };

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
        {/* Label and Character Count */}
        {(label || showCharCount) && (
          <div className="flex items-center justify-between mb-2">
            {label && (
              <label htmlFor={textareaId} className={labelStyles}>
                {label}
              </label>
            )}
            {showCharCount && maxLength && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {charCount}/{maxLength}
              </span>
            )}
          </div>
        )}

        {/* Textarea Field */}
        <div className="relative">
          <textarea
            ref={ref}
            id={textareaId}
            disabled={disabled}
            maxLength={maxLength}
            value={value}
            className={`
              ${baseTextareaStyles}
              ${variantStyles[variant]}
              ${sizeStyles[textareaSize]}
              ${variant === "default" ? stateStyles[actualState] : ""}
              ${resizeStyles[resize]}
              ${className}
            `}
            {...props}
          />

          {/* State Icon (positioned at top-right) */}
          {stateIcon && (
            <div className="absolute top-3 right-3 pointer-events-none">
              {stateIcon}
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

Textarea.displayName = "Textarea";

export default Textarea;












