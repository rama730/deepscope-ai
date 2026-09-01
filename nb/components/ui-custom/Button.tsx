import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = 
  | "primary" 
  | "secondary" 
  | "outline" 
  | "ghost" 
  | "danger" 
  | "success";

export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = "",
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = `
      inline-flex items-center justify-center gap-2 
      font-medium rounded-lg 
      transition-all duration-200 
      focus:outline-none focus:ring-2 focus:ring-offset-2 
      disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
      ${fullWidth ? "w-full" : ""}
    `;

    // Variant styles
    const variantStyles = {
      primary: `
        bg-indigo-600 text-white 
        hover:bg-indigo-700 active:bg-indigo-800 
        focus:ring-indigo-500/60
        dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:active:bg-indigo-800
        shadow-sm hover:shadow-md
      `,
      secondary: `
        bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 
        hover:bg-zinc-200 active:bg-zinc-300 
        focus:ring-zinc-400
        dark:bg-zinc-800 dark:text-zinc-100 
        dark:hover:bg-zinc-700 dark:active:bg-zinc-600
        border border-zinc-200 dark:border-zinc-700
      `,
      outline: `
        bg-transparent text-zinc-700 dark:text-zinc-300 
        border border-zinc-300 dark:border-zinc-700 
        hover:bg-zinc-50 dark:bg-zinc-900 active:bg-zinc-100 
        focus:ring-zinc-400
        dark:text-zinc-300 dark:border-zinc-700 
        dark:hover:bg-zinc-900 dark:active:bg-zinc-800
      `,
      ghost: `
        bg-transparent text-zinc-700 dark:text-zinc-300 
        hover:bg-zinc-100 dark:bg-zinc-900 active:bg-zinc-200 
        focus:ring-zinc-400
        dark:text-zinc-300 
        dark:hover:bg-zinc-800 dark:active:bg-zinc-700
      `,
      danger: `
        bg-red-600 text-white 
        hover:bg-red-700 active:bg-red-800 
        focus:ring-red-500/60
        dark:bg-red-600 dark:hover:bg-red-700 dark:active:bg-red-800
        shadow-sm hover:shadow-md
      `,
      success: `
        bg-green-600 text-white 
        hover:bg-green-700 active:bg-green-800 
        focus:ring-green-500/60
        dark:bg-green-600 dark:hover:bg-green-700 dark:active:bg-green-800
        shadow-sm hover:shadow-md
      `,
    };

    // Size styles
    const sizeStyles = {
      xs: "text-xs px-2.5 py-1.5 min-h-[28px]",
      sm: "text-sm px-3 py-2 min-h-[36px]",
      md: "text-sm px-4 py-2.5 min-h-[40px]",
      lg: "text-base px-5 py-3 min-h-[44px]",
      xl: "text-base px-6 py-3.5 min-h-[48px]",
    };

    // Icon size based on button size
    const iconSizeClass = {
      xs: "w-3 h-3",
      sm: "w-4 h-4",
      md: "w-4 h-4",
      lg: "w-5 h-5",
      xl: "w-5 h-5",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <Loader2 className={`${iconSizeClass[size]} animate-spin`} />
        )}
        {!loading && leftIcon && (
          <span className={iconSizeClass[size]}>{leftIcon}</span>
        )}
        <span>{children}</span>
        {!loading && rightIcon && (
          <span className={iconSizeClass[size]}>{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;


