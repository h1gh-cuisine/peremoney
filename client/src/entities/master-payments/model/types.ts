// docs-agent.md 1.12.3

export type MasterPaymentStatus = "paid" | "pending";

export interface MasterPayment {
  id: string;
  projectId: string;
  projectName: string;
  legalEntity: string;
  amount: number;
  managerId: string;
  status: MasterPaymentStatus;
  createdAt: string; // ISO date
}
