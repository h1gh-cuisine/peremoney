// docs-agent.md 1.8, 3.1 (GET /v1/crm/open-api/projects/{project_id}/script)

export interface ScriptData {
  projectId: string;
  name: string;
  script: string; // сырой HTML от провайдера
  updatedAt: string; // ISO date
}
