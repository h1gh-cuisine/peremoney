const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
  laquo: '«', raquo: '»', hellip: '…', copy: '©', reg: '®', bull: '•',
};

function decodeEntities(value: string) {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith('#x')) return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    if (code.startsWith('#')) return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
    return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
  });
}

/** Converts provider HTML into readable, style-free text before it reaches the client. */
export function providerScriptToText(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = decodeEntities(value
    .replace(/<(script|style|head|svg|canvas)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n• ')
    .replace(/<\/\s*(p|div|h[1-6]|li|tr|section|article|blockquote)\s*>/gi, '\n')
    .replace(/<\/\s*(td|th)\s*>/gi, '\t')
    .replace(/<[^>]+>/g, ''))
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/[\t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n+\s*•/g, '\n•')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text && text.toLowerCase() !== 'null' ? text : null;
}
