export function parseDisplayDate(value: string): Date {
  if (!value) return new Date(NaN)

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`)
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value)) {
    return new Date(value.replace(" ", "T"))
  }

  return new Date(value)
}

export function hasExplicitTime(value: string): boolean {
  return /T\d{2}:\d{2}/.test(value) || /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value)
}
