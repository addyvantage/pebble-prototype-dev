"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"

function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(" ")
}

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-0 font-sans", className)}
            classNames={{
                /* --- Container --- */
                months: "w-fit mx-auto",
                month: "space-y-3",

                /* --- Caption --- */
                caption: "flex items-center justify-center",
                caption_label:
                    "text-base font-semibold tracking-tight text-pebble-text-primary",

                /* Hide nav */
                nav: "hidden",
                nav_button: "hidden",

                /* --- Weekday header --- */
                head_row: "grid grid-cols-7 gap-2",
                head_cell:
                    "h-8 w-10 sm:w-11 flex items-center justify-center text-pebble-text-muted font-medium text-[11px]",

                /* --- Weeks --- */
                row: "grid grid-cols-7 gap-2",
                cell: "flex items-center justify-center p-0",

                /* --- Day button (neutral, no blue) --- */
                day:
                    "inline-flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-2xl " +
                    "border border-pebble-border/20 bg-pebble-overlay/[0.03] " +
                    "text-[13px] font-semibold text-pebble-text-primary " +
                    "transition-colors " +
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pebble-border/50",

                /* --- Selected: intentionally neutralized to prevent blue --- */
                day_selected: "",
                day_today: "ring-2 ring-pebble-border/35",
                day_outside: "opacity-30 text-pebble-text-muted",
                day_disabled: "cursor-default pointer-events-none opacity-100",
                day_hidden: "invisible",

                /* -------- v9 keys -------- */
                month_caption: "flex items-center justify-center",
                month_grid: "space-y-2",

                weekdays: "grid grid-cols-7 gap-2",
                weekday:
                    "h-8 w-10 sm:w-11 flex items-center justify-center text-pebble-text-muted font-medium text-[11px]",

                week: "grid grid-cols-7 gap-2",
                day_button:
                    "inline-flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-2xl " +
                    "border border-pebble-border/20 bg-pebble-overlay/[0.03] " +
                    "text-[13px] font-semibold text-pebble-text-primary " +
                    "transition-colors " +
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pebble-border/50",

                /* v9 selected: neutralized */
                selected: "",
                today: "ring-2 ring-pebble-border/35",
                outside: "opacity-30 text-pebble-text-muted",
                disabled: "cursor-default pointer-events-none opacity-100",
                hidden: "invisible",

                ...classNames,
            }}
            {...props}
        />
    )
}

Calendar.displayName = "Calendar"
export { Calendar }
