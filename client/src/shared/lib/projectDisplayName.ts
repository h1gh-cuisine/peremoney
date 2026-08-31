/** Проект хранит полный путь провайдера в имени — показываем только последний сегмент. */
export function projectDisplayName(name: string) {
  return name.split("/").map((part) => part.trim()).filter(Boolean).at(-1) ?? name;
}
