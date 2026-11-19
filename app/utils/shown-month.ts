export function shownMonth(today: Date, year?: number, month?: number) {
  return new Date(year ?? today.getFullYear(), month ?? today.getMonth(), 1);
}
