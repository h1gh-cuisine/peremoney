import { getProjectTypeLabel } from "@/shared/lib/projectType";
import type { CreateProjectInput } from "../model/types";

/** "{Регион}/Peremoney ЛКП {Тип}/{Сфера}/{Название клиента}" (docs-agent.md 2.8.3) */
export function composeProjectName(input: CreateProjectInput): string {
  return `${input.region}/Peremoney ЛКП ${getProjectTypeLabel(input.type)}/${input.sphere}/${input.clientName}`;
}
