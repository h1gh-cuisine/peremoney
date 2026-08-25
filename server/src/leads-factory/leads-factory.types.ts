export interface ProviderAnswer {
  id: number;
  date: string;
  success_date: string | null;
  date_updated: string;
  status: string;
  mobile_tel: string;
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

export type ProviderIntegrationName = 'telegram' | 'bitrix' | 'amocrm' | 'email';
