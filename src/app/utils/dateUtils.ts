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
