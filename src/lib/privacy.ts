export function maskAmount(formatted: string, hidden: boolean): string {
  return hidden ? '••••••' : formatted
}
