/** Клиент входит под названием проекта; технический логин сотрудника остаётся уникальным. */
export function generateProjectLogins(projectName: string, uniquenessKey: string) {
  const clientLogin = projectName.normalize("NFKC").trim().replace(/\s+/g, " ");
  const base = clientLogin.toLocaleLowerCase("ru")
    .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "project";
  const suffix = uniquenessKey.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(-6) || "new";
  return { clientLogin, employeeLogin: `${base}-staff-${suffix}` };
}
