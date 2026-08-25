export interface TochkaPayer {
  organizationName: string;
  inn: string;
  kpp?: string;
  legalAddress?: string;
  checkingAccount?: string;
}

interface InvoiceInput {
  customerCode: string;
  accountId: string;
  invoiceNo: string;
  quantity: number;
  unitPrice: number;
  payer: TochkaPayer;
  expiryDate: string;
  positionName: string;
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
      ...(input.payer.checkingAccount ? { accountId: input.payer.checkingAccount } : {}),
    },
    Content: { Invoice: {
      number: input.invoiceNo,
      paymentExpiryDate: input.expiryDate,
      totalAmount,
      totalNds: 0,
      Positions: [{
        positionName: input.positionName,
        unitCode: 'услуга.',
        ndsKind: 'without_nds',
        price: input.unitPrice,
        quantity: input.quantity,
        totalAmount,
        totalNds: 0,
      }],
    } },
  } };
}
