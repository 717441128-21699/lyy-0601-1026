import dayjs from 'dayjs'

export const formatPrice = (price: number): string => {
  return price.toFixed(2)
}

export const formatDate = (date: string, format = 'YYYY-MM-DD'): string => {
  return dayjs(date).format(format)
}

export const formatDateTime = (date: string): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

export const formatTime = (date: string): string => {
  return dayjs(date).format('HH:mm')
}

export const generateId = (prefix = ''): string => {
  return `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 9)}`
}

export const calculateConversionRate = (tasters: number, buyers: number): number => {
  if (tasters === 0) return 0
  return Number(((buyers / tasters) * 100).toFixed(1))
}

export const calculateAvgRating = (ratings: number[]): number => {
  if (ratings.length === 0) return 0
  const sum = ratings.reduce((a, b) => a + b, 0)
  return Number((sum / ratings.length).toFixed(1))
}

export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export const ageGroupColors: Record<string, string> = {
  child: '#165DFF',
  teen: '#00B42A',
  adult: '#FF7D00',
  senior: '#86909C'
}

export const purchaseIntentColors: Record<string, string> = {
  high: '#00B42A',
  medium: '#FF7D00',
  low: '#86909C',
  none: '#F53F3F'
}

export const statusColors: Record<string, string> = {
  pending: '#86909C',
  ongoing: '#00B42A',
  completed: '#165DFF'
}

export const statusLabels: Record<string, string> = {
  pending: '未开始',
  ongoing: '进行中',
  completed: '已结束'
}
