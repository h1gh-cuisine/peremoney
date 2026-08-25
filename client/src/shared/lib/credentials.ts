/** Мок-генерация логина/пароля для нового кабинета (docs-agent.md 2.1, 2.8.3). */
export function generateCredentials(prefix: string): { login: string; password: string } {
  const suffix = Math.random().toString(36).slice(2, 8);
  const password = Math.random().toString(36).slice(2, 10);
  return { login: `${prefix}_${suffix}`, password };
}
