import React, { useMemo } from "react"
import type { DayProps } from "react-day-picker"
import { Calendar } from "../ui/calendar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"

export type HeatmapLevel = 0 | 1 | 2 | 3
export type HeatmapDatum = { date: Date; count: number; level: HeatmapLevel }

export type HeatmapLabels = {
    less?: string
    more?: string
    solveSingular?: string
    solvePlural?: string
    on?: string
}

function toLocalMidnight(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function toDateKeyLocal(d: Date) {
    const x = toLocalMidnight(d)
    const y = x.getFullYear()
    const m = String(x.getMonth() + 1).padStart(2, "0")
    const day = String(x.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
}

function formatMonthShort(d: Date) {
    return d.toLocaleString(undefined, { month: "short" })
}

function formatTooltipDate(d: Date) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}



const DAY_SIZE = 16 // base; we’ll scale with CSS
const DAY_GAP = 4

export function PebbleCalendarHeatmap({
    data,
    labels = {}
}: {
    data: HeatmapDatum[]
    labels?: HeatmapLabels
}) {
    // Build a fast lookup by dateKey
    const byKey = useMemo(() => {
        const m = new Map<string, HeatmapDatum>()
        for (const item of data) m.set(toDateKeyLocal(item.date), item)
        return m
    }, [data])

    const todayKey = useMemo(() => toDateKeyLocal(new Date()), [])

    // We want the heatmap to start ~11 months ago for 12-month band
    const defaultMonth = useMemo(() => {
        const now = toLocalMidnight(new Date())
        const d = new Date(now)
        d.setMonth(d.getMonth() - 11)
        return d
    }, [])

    const HeatmapDay = (props: DayProps) => {
        const { day, modifiers, className, style } = props

        const date = day.date
        const key = toDateKeyLocal(date)
        const datum = byKey.get(key)
        const count = datum?.count ?? 0
        const level = datum?.level ?? 0

        const labelCount = count
        const labelSolve = count === 1 ? (labels.solveSingular || "solve") : (labels.solvePlural || "solves")
        const labelOn = labels.on || "on"
        const labelDate = formatTooltipDate(toLocalMidnight(date))

        let bgClass = "bg-pebble-surface/60 border border-pebble-border/25"
        if (level === 1) bgClass = "bg-pebble-accent/18 border border-pebble-border/25"
        else if (level === 2) bgClass = "bg-pebble-accent/35 border border-pebble-border/25"
        else if (level === 3) bgClass = "bg-pebble-accent/65 border border-pebble-accent/35"

        if (modifiers.outside) {
            bgClass = "bg-transparent border border-transparent text-transparent"
        }

        const isToday = key === todayKey && !modifiers.outside

        const interactionClasses = !modifiers.outside
            ? "transition-[transform,box-shadow,background-color] duration-150 ease-out hover:scale-[1.06] hover:shadow-sm active:scale-[1.02] cursor-default focus-visible:ring-2 focus-visible:ring-pebble-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-pebble-overlay/[0.04]"
            : ""

        const todayRingClass = isToday
            ? "ring-2 ring-pebble-accent/25 ring-offset-2 ring-offset-pebble-overlay/[0.04]"
            : ""

        return (
            <td className={className} style={style} role="presentation">
                <Tooltip key={key}>
                    <TooltipTrigger asChild>
                        <div
                            className={`h-[var(--hm-box)] w-[var(--hm-box)] rounded-[4px] outline-none ${bgClass} ${interactionClasses} ${todayRingClass}`}
                            tabIndex={modifiers.outside ? -1 : 0}
                        >
                            <span className="sr-only">
                                {labelCount} {labelSolve} {labelOn} {labelDate}
                            </span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent
                        side="top"
                        align="center"
                        className="whitespace-nowrap z-[99999] bg-pebble-surface text-pebble-text-primary border border-pebble-border/30 shadow-xl rounded-[10px] px-3 py-1.5 text-[11px]"
                    >
                        <span className="font-semibold">{labelCount}</span> <span className="text-pebble-text-secondary">{labelSolve} {labelOn} {labelDate}</span>
                    </TooltipContent>
                </Tooltip>
            </td>
        )
    }

    return (
        <div
            className="w-full"
            style={
                {
                    ["--hm-box" as any]: `${DAY_SIZE}px`,
                    ["--hm-gap" as any]: `${DAY_GAP}px`,
                } as React.CSSProperties
            }
        >
            <TooltipProvider delayDuration={80}>
                <Calendar
                    numberOfMonths={12}
                    defaultMonth={defaultMonth}
                    className="w-full"
                    formatters={{
                        formatCaption: (date) => formatMonthShort(date),
                    }}
                    classNames={{
                        months: "flex w-full gap-2",
                        month: "space-y-2 flex flex-col",
                        month_caption: "flex justify-start pl-2 text-xs text-pebble-text-muted font-medium w-full",
                        nav: "hidden",
                        month_grid: "border-collapse flex",
                        weeks: "flex",
                        week: "flex flex-col focus:outline-none",
                        day: "p-[calc(var(--hm-gap)/2)] m-0 leading-none",
                        weekdays: "hidden",
                    }}
                    components={{
                        Day: HeatmapDay,
                    }}
                />
            </TooltipProvider>

            {/* Legend */}
            <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-pebble-text-secondary">
                <span>{labels.less || "Less"}</span>
                <div className="flex items-center gap-[4px]">
                    <div className="h-4 w-4 rounded-[4px] bg-pebble-surface/60 border border-pebble-border/25" />
                    <div className="h-4 w-4 rounded-[4px] bg-pebble-accent/18 border border-pebble-border/25" />
                    <div className="h-4 w-4 rounded-[4px] bg-pebble-accent/35 border border-pebble-border/25" />
                    <div className="h-4 w-4 rounded-[4px] bg-pebble-accent/65 border border-pebble-accent/35" />
                </div>
                <span>{labels.more || "More"}</span>
            </div>
        </div>
    )
}
