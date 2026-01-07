/**
 * Returns today's date in YYYY-MM-DD format based on the USER'S local system time.
 * This prevents timezone issues where "today" is calculated as "tomorrow" or "yesterday"
 * due to UTC conversion (e.g. late night in US vs morning in Australia).
 */
export function getLocalTodayDate(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/**
 * Parses YYYY-MM-DD string into a Date object at local midnight.
 */
export function parseLocalYMD(dateStr: string): Date {
    const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
    const [y, m, d] = cleanDateStr.split('-').map(Number)
    return new Date(y, m - 1, d)
}

/**
 * Normalizes a date to local midnight.
 */
export function normalizeDate(d: Date): Date {
    const newD = new Date(d)
    newD.setHours(0, 0, 0, 0)
    return newD
}

/**
 * Formats a Date object as YYYY-MM-DD in LOCAL time.
 */
export function formatLocalDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/**
 * Formats a Date object as an ISO-like string (YYYY-MM-DDTHH:mm:ss) in LOCAL time.
 * Unlike toISOString() which converts to UTC, this preserves the local timezone,
 * preventing issues where dates shift to "yesterday" due to timezone conversion.
 */
export function formatLocalDateTime(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}
