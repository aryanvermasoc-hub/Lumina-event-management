export function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

export function splitList(value) {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean)
}

export function toDateInputValue(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

export function formatDate(value) {
  if (!value) return 'Date pending'
  return new Date(value).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
}

export function getCountdown(value) {
  if (!value) return 'TBA'
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'Completed'
  if (days === 0) return 'Today'
  return `${days} days`
}

export function getInitials(value = 'Event') {
  return value.split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
}

export function slugify(value) {
  return String(value).toLowerCase().replace(/\s+/g, '-')
}