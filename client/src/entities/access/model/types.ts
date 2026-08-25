// docs-agent.md, разделы 1.2–1.3, 2.1

export type AccessLevel = "full" | "limited";

/** Разделы, видимость которых можно скрывать для limited-доступа (docs-agent.md 1.3) */
export type HideableSection =
  | "contacts"
  | "sources"
  | "script"
  | "finance"
  | "settings";

export type NavSectionId =
  | "dashboard"
  | "contacts"
  | "leads"
  | "sources"
  | "script"
  | "finance"
  | "payer"
  | "settings";

export interface SectionVisibility {
  contacts: boolean;
  sources: boolean;
  script: boolean;
  finance: boolean;
  settings: boolean;
}
