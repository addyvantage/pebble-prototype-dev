"use client"

import React from "react"
import type { CSSProperties } from "react"

function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(" ")
}

interface TextShimmerProps {
    children: string
    as?: React.ElementType
    className?: string
    duration?: number
    spread?: number
}

export function TextShimmer({
    children,
    as: Component = "span",
    className,
    duration = 2.6,
    spread = 1.8,
}: TextShimmerProps) {
    const dynamicSpread = React.useMemo(() => {
        return children.length * spread
    }, [children, spread])

    return (
        <Component
            className={cn(
                "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
                "[background-image:linear-gradient(110deg,transparent_35%,var(--base-gradient-color,#1d4ed8)_50%,transparent_65%),linear-gradient(var(--base-color,#0f2952),var(--base-color,#0f2952))]",
                "[background-repeat:no-repeat,no-repeat]",
                "motion-safe:[animation:shimmer_var(--shimmer-duration,2.6s)_linear_infinite]",
                // deep navy base
                '[--base-color:#0f2952]',
                // dark vibrant blue shimmer in light mode (reads as a darker wave)
                '[--base-gradient-color:#1d4ed8]',
                // dark mode: medium blue base, near-white shimmer
                'dark:[--base-color:#93C5FD]',
                'dark:[--base-gradient-color:#e0f2fe]',
                className
            )}
            style={
                {
                    "--shimmer-duration": `${duration}s`,
                    "--spread": `${dynamicSpread}px`,
                } as CSSProperties
            }
        >
            {children}
        </Component>
    )
}
