// docs-agent.md 1.6

export type LeadStatus = "not_processed" | "negotiation" | "not_relevant" | "rejected" | "purchased";

export interface LeadRecording {
  id: string;
  link: string;
  date: string; // ISO datetime
}

export interface Lead {
  id: string;
  displayId: string; // числовой ID ответа провайдера для отображения
  successDate: string; // ISO date, данные провайдера — только чтение
  mobileTel: string;
  name: string; // комментарий с провайдера
  site: string;
  recordings: LeadRecording[];
  // Поля ниже редактируются клиентом/сотрудником в ЛК:
  feedback: string;
  status: LeadStatus;
  amount: number | null;
}
