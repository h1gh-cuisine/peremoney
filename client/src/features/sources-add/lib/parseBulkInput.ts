/** Разбивает вставленный текст на строки: номера/сайты, по одному на строку. */
export function parseBulkInput(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
