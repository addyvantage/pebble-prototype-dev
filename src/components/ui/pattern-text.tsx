import React from "react"

function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(" ")
}

export function PatternText({
    text = "Text",
    className,
    ...props
}: Omit<React.ComponentProps<"span">, "children"> & { text: string }) {
    return (
        <span
            data-shadow={text}
            className={cn("pebble-pattern-text", className)}
            {...props}
        >
            {text}
        </span>
    )
}
