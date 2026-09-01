"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const HoverCard = ({ children, openDelay = 200, closeDelay = 300, ...props }: React.ComponentProps<typeof PopoverPrimitive.Root> & { openDelay?: number, closeDelay?: number }) => {
    const [open, setOpen] = React.useState(false)
    const openTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
    const closeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

    const handleOpen = () => {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
        openTimeoutRef.current = setTimeout(() => setOpen(true), openDelay)
    }

    const handleClose = () => {
        if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current)
        closeTimeoutRef.current = setTimeout(() => setOpen(false), closeDelay)
    }

    return (
        <PopoverPrimitive.Root open={open} onOpenChange={setOpen} {...props}>
            <div
                onMouseEnter={handleOpen}
                onMouseLeave={handleClose}
                onFocus={handleOpen}
                onBlur={handleClose}
                className="inline-block"
            >
                {children}
            </div>
        </PopoverPrimitive.Root>
    )
}

const HoverCardTrigger = PopoverPrimitive.Trigger

const HoverCardContent = React.forwardRef<
    React.ElementRef<typeof PopoverPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
    <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
            ref={ref}
            align={align}
            sideOffset={sideOffset}
            className={cn(
                "z-50 w-64 rounded-xl border bg-popover p-4 text-popover-foreground shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                className
            )}
            {...props}
        />
    </PopoverPrimitive.Portal>
))
HoverCardContent.displayName = PopoverPrimitive.Content.displayName

export { HoverCard, HoverCardTrigger, HoverCardContent }
