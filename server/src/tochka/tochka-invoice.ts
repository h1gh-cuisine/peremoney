export interface TochkaPayer {
  organizationName: string;
  inn: string;
  kpp?: string;
  legalAddress?: string;
  bankName?: string;
  contractNumber?: string;
  contractDate?: string;
}

// Точка отклоняет счёт 400-й (Validation Error), если Positions[].unitCode не
// входит в этот закрытый список — подтверждено реальным ответом банка.
// Точка в конце каждого значения — их формат сокращения, не опечатка.
export type TochkaUnitCode =
  | 'шт.' | 'тыс.шт.' | 'компл.' | 'пар.' | 'усл.ед.' | 'упак.' | 'услуга.' | 'пач.'
  | 'мин.' | 'ч.' | 'сут.' | 'г.' | 'кг.' | 'л.' | 'м.' | 'м2.' | 'м3.' | 'км.' | 'га.'
  | 'кВт.' | 'кВт.ч.';

interface InvoiceInput {
  customerCode: string;
  accountId: string;
  invoiceNo: string;
  quantity: number;
  unitPrice: number;
  payer: TochkaPayer;
  positionName: string;
  unitCode: TochkaUnitCode;
  basedOn: string;
  // Было убрано в b8c5765 вместе с фиксом unitCode; после этого клиенты
  // перестали видеть QR-код на присланных счетах — совпадает по времени.
  // Возвращаем срок действия счёта, раз он документирован Точкой как штатное
  // поле Invoice (влияет как минимум на статус payment_expired).
  expiryDate: string;
}

export function buildTochkaInvoice(input: InvoiceInput) {
  const totalAmount = Number((input.quantity * input.unitPrice).toFixed(2));
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
    Content: { Invoice: {
      number: input.invoiceNo,
      basedOn: input.basedOn,
      paymentExpiryDate: input.expiryDate,
      totalAmount,
      totalNds: 0,
      Positions: [{
        positionName: input.positionName,
        unitCode: input.unitCode,
        ndsKind: 'without_nds',
        price: input.unitPrice,
        quantity: input.quantity,
        totalAmount,
        totalNds: 0,
      }],
    } },
  } };
}
