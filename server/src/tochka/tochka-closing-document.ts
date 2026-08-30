import { TochkaPayer } from './tochka-invoice';

interface ClosingDocumentPosition {
  positionName: string;
  unitCode: string;
  ndsKind: 'without_nds';
  price: number;
  quantity: number;
  totalAmount: number;
}

interface ClosingDocumentInput {
  customerCode: string;
  accountId: string;
  documentNo: string;
  payer: TochkaPayer;
  basedOn: string;
  positions: ClosingDocumentPosition[];
}

/** Payload for Tochka Create Closing Document (Act). */
export function buildTochkaClosingAct(input: ClosingDocumentInput) {
  const totalAmount = Number(input.positions.reduce((sum, item) => sum + item.totalAmount, 0).toFixed(2));
  return { Data: {
    customerCode: input.customerCode,
    accountId: input.accountId,
    SecondSide: {
      type: input.payer.inn.length === 12 ? 'ip' : 'company',
      taxCode: input.payer.inn,
      ...(input.payer.kpp ? { kpp: input.payer.kpp } : {}),
      secondSideName: input.payer.organizationName,
      ...(input.payer.legalAddress ? { legalAddress: input.payer.legalAddress } : {}),
      ...(input.payer.bankName ? { bankName: input.payer.bankName } : {}),
    },
    Content: { Act: {
      number: input.documentNo,
      basedOn: input.basedOn,
      totalAmount,
      totalNds: 0,
      Positions: input.positions,
    } },
  } };
}
