import type { Manager } from "../model/types";

export function managersFromProjectNames(names: string[]): Manager[] {
  return [...new Set(names.map((name) => name.trim()).filter(Boolean))].map((name) => ({
    id: name,
    name,
  }));
}
