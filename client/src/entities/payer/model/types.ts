// docs-agent.md 1.10, 2.7.1 (данные плательщика подставляются в шаблон счёта/акта)

export interface PayerDetails {
  organizationName: string;
  inn: string;
  kpp: string;
  ogrn: string;
  legalAddress: string;
  bankName: string;
  bik: string;
  checkingAccount: string;
  correspondentAccount: string;
  phone: string;
  email: string;
  contractNumber?: string;
  contractDate?: string;
  signerName?: string;
}
