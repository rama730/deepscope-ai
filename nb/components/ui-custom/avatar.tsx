"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof Image>,
  Omit<React.ComponentPropsWithoutRef<typeof Image>, "width" | "height" | "alt"> & { alt: string }
>(({ className, src, alt, ...props }, ref) => {
  const [hasError, setHasError] = React.useState(false);

  // eslint-disable-next-line @next/next/no-img-element
  if (!src || hasError) {
    return null;
  }

  // We need to support both string and StaticImport for src, matching next/image
  const imageSrc = src;

  return (
    <div className="relative w-full h-full">
      <Image
        ref={ref}
        src={imageSrc}
        alt={alt}
        fill
        sizes="40px"
        onError={() => setHasError(true)}
        className={cn("aspect-square object-cover", className)}
        {...props}
      />
    </div>
  );
})
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }
