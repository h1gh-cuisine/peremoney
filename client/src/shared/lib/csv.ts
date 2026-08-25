export function buildCsv(header: string[], rows: string[][]): string {
  const escape = (cell: string) => {
    const safe = /^[\t\r\n ]*[=+\-@]/.test(cell) ? `'${cell}` : cell;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const lines = [header, ...rows].map((row) => row.map(escape).join(";"));
  return "﻿" + lines.join("\r\n");
}

/** Простой экспорт таблицы в CSV (открывается Excel'ем без доп. библиотек). */
export function downloadCsv(filename: string, header: string[], rows: string[][]): void {
  const csvContent = buildCsv(header, rows);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
