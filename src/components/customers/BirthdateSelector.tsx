import { Label } from '@/components/ui/label'

interface BirthdateSelectorProps {
    value: string // yyyy-mm-dd format
    onChange: (date: string) => void
    error?: string
}

export function BirthdateSelector({ value, onChange, error }: BirthdateSelectorProps) {
    // Parse existing value
    const [year, month, day] = value ? value.split('-') : ['', '', '']

    // Generate options
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i)
    const months = Array.from({ length: 12 }, (_, i) => i + 1)
    const days = Array.from({ length: 31 }, (_, i) => i + 1)

    const handleChange = (type: 'year' | 'month' | 'day', val: string) => {
        let newYear = year
        let newMonth = month
        let newDay = day

        if (type === 'year') newYear = val
        if (type === 'month') newMonth = val
        if (type === 'day') newDay = val

        // Only create date string if all parts are filled
        if (newYear && newMonth && newDay) {
            const formattedMonth = newMonth.padStart(2, '0')
            const formattedDay = newDay.padStart(2, '0')
            onChange(`${newYear}-${formattedMonth}-${formattedDay}`)
        } else if (!newYear && !newMonth && !newDay) {
            onChange('')
        } else {
            // Partial - store as is for now
            const formattedMonth = newMonth ? newMonth.padStart(2, '0') : ''
            const formattedDay = newDay ? newDay.padStart(2, '0') : ''
            onChange(`${newYear || ''}-${formattedMonth}-${formattedDay}`)
        }
    }

    const selectClass = `h-10 px-2 rounded-md border text-sm
    border-zinc-200 dark:border-zinc-700 
    bg-white dark:bg-zinc-800 
    text-zinc-900 dark:text-white
    focus:outline-none focus:ring-2 focus:ring-zinc-500
    ${error ? 'border-red-500' : ''}`

    return (
        <div className="space-y-2">
            <Label>생년월일</Label>
            <div className="flex gap-2">
                {/* Year */}
                <select
                    value={year}
                    onChange={(e) => handleChange('year', e.target.value)}
                    className={`${selectClass} w-24`}
                >
                    <option value="">연도</option>
                    {years.map(y => (
                        <option key={y} value={String(y)}>{y}</option>
                    ))}
                </select>

                {/* Month */}
                <select
                    value={month ? String(parseInt(month)) : ''}
                    onChange={(e) => handleChange('month', e.target.value)}
                    className={`${selectClass} w-20`}
                >
                    <option value="">월</option>
                    {months.map(m => (
                        <option key={m} value={String(m)}>{m}월</option>
                    ))}
                </select>

                {/* Day */}
                <select
                    value={day ? String(parseInt(day)) : ''}
                    onChange={(e) => handleChange('day', e.target.value)}
                    className={`${selectClass} w-20`}
                >
                    <option value="">일</option>
                    {days.map(d => (
                        <option key={d} value={String(d)}>{d}일</option>
                    ))}
                </select>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    )
}
