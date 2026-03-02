import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

function cn(...classes: Array<string | undefined | false | null>) {
    return classes.filter(Boolean).join(" ")
}

export const TooltipProvider = TooltipPrimitive.Provider
export const Tooltip = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger

export const TooltipContent = React.forwardRef<
    React.ElementRef<typeof TooltipPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 8, ...props }, ref) => (
    <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
            ref={ref}
            sideOffset={sideOffset}
            className={cn(
                // Premium Pebble tooltip
                "z-[99999] rounded-[10px] border border-pebble-border/30 bg-pebble-canvas px-3 py-2 text-[11px] leading-tight text-pebble-text-primary shadow-xl",
                "backdrop-blur-sm",
                "data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out",
                className
            )}
            {...props}
        />
    </TooltipPrimitive.Portal>
))
TooltipContent.displayName = "TooltipContent"
