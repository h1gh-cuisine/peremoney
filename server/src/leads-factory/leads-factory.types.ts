// Nullability matches the real contract (Crm_AnswerOut in leads-docs.json) — date,
// date_updated, status and mobile_tel are all nullable there, not just success_date.
export interface ProviderAnswer {
  id: number;
  date: string | null;
  success_date: string | null;
  date_updated: string | null;
  status: string | null;
  mobile_tel: string | null;
  name: string | null;
  site: string | null;
  mobile_operator: string | null;
}

export interface ProviderAnswersPage {
  items: ProviderAnswer[];
  total: number;
}

export interface ProviderCall {
  link: string;
  date: string;
}

export interface ProviderTag {
  id: number;
  name?: string;
  tag?: string;
  tag_name?: string;
  type?: string;
  source_type?: string;
  new_answer?: number;
  success?: number;
  conversion?: number;
  sebes?: number;
  norm_work?: boolean;
  limit?: number;
}

export interface ProviderSource {
  id: number;
  source_type?: string;
  source?: string;
  phone?: string;
}

export interface ProviderScript {
  project_id: number;
  name: string;
  script: unknown;
  script_lvl: number;
}

export interface ProviderProjectType {
  id: number;
  name: string;
}

export interface ProviderProjectCreated {
  id: number;
}

export interface ProviderProjectFinance {
  project_id: number;
  project_name?: string | null;
  totals: {
    trati?: number;
    success_count?: number;
  };
}

export interface ProviderProjectDetail {
  id: number;
  name: string | null;
  sphere: string | null;
  status: string;
  timezone: number | null;
  numbers: boolean;
  vdl: boolean;
  prozvon_base: boolean;
}

export interface ProviderRegion {
  region_id: number;
  region_name: string;
}

export type ProviderIntegrationName = 'telegram' | 'bitrix' | 'amocrm' | 'email';
