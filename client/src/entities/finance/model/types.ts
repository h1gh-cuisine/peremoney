// docs-agent.md 1.9, 2.7

export type PaymentStatus = "paid" | "pending";
export type InvoiceCreationStatus = "pending" | "succeeded" | "failed" | "uncertain";

export interface Payment {
  id: string;
  amount: number; // ₽
  quantity: number; // штук в счёте
  status: PaymentStatus;
  invoiceCreationStatus?: InvoiceCreationStatus;
  createdAt: string; // ISO date
  documentId?: string;
  invoiceNo?: string;
  unitPrice?: number;
}

/** "Потрачено/всего" в штуках (docs-agent.md 2.7.4) */
export interface UnitBalance {
  totalUnits: number;
  usedUnits: number;
}
