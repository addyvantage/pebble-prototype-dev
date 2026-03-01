import { useState, useCallback } from 'react'
import { getSolvedMap } from './solvedStore'

interface CodingDaysState {
    codedDaysSet: Set<string>
    refreshCodedDays: () => void
}

export function useCodingDaysStore(): CodingDaysState {
    const [codedDaysSet, setCodedDaysSet] = useState<Set<string>>(new Set())

    const refreshCodedDays = useCallback(() => {
        const solvedMap = getSolvedMap()
        const newSet = new Set<string>()

        for (const problemId in solvedMap) {
            const dateISO = solvedMap[problemId].solvedAtISO
            if (dateISO) {
                const dateObj = new Date(dateISO)
                const year = dateObj.getFullYear()
                const month = String(dateObj.getMonth() + 1).padStart(2, '0')
                const day = String(dateObj.getDate()).padStart(2, '0')
                newSet.add(`${year}-${month}-${day}`)
            }
        }

        setCodedDaysSet(newSet)
    }, [])

    return { codedDaysSet, refreshCodedDays }
}
