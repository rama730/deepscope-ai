"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function TooltipProvider({
  children,
}: {
  delayDuration?: number;
  children: React.ReactNode;
}) {
  // Compatibility wrapper: we don't currently ship @radix-ui/react-tooltip.
  // This provider is a no-op so consumers can keep the same API.
  return <>{children}</>;
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof Popover>) {
  return <Popover {...props} />;
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof PopoverTrigger>) {
  return <PopoverTrigger {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof PopoverContent>) {
  return (
    <PopoverContent
      sideOffset={sideOffset}
      className={cn(
        "z-[220] overflow-hidden rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };


