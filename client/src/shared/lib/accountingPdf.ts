import type { PayerDetails } from '@/entities/payer';
import type { Payment } from '@/entities/finance';

const SUPPLIER = {
  name: 'Индивидуальный предприниматель Сушкевич Николай Андреевич',
  inn: '772749258701', bank: 'ООО «Банк Точка» г. Москва', bik: '044525104',
  correspondent: '30101810745374525104', account: '40802810020000888978',
};

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (symbol) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[symbol]!);
}

function money(value: number) {
  return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function date(value: string | Date) {
  return new Intl.DateTimeFormat('ru-RU').format(new Date(value));
}

function documentShell(title: string, body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      @page { size: A4; margin: 16mm 14mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #111; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.4; }
      .muted { font-size: 11px; }
      .right { text-align: right; }
      .center { text-align: center; }
      h1 { font-size: 19px; margin: 22px 0 16px; }
      h2 { font-size: 16px; margin: 0 0 12px; }
      p { margin: 6px 0; }
      .bank { width: 100%; border-collapse: collapse; }
      .bank td { border: 1.5px solid #222; padding: 5px 8px; vertical-align: top; }
      .items { width: 100%; border-collapse: collapse; margin: 18px 0 10px; }
      .items th, .items td { border: 1.5px solid #222; padding: 6px 7px; }
      .items th { font-size: 11px; }
      .totals { margin-left: auto; width: 48%; font-size: 14px; }
      .totals div { display: flex; justify-content: space-between; padding: 3px 0; }
      .signature { display: grid; grid-template-columns: 1fr 1fr; gap: 50px; margin-top: 44px; }
      .line { display: inline-block; border-bottom: 1px solid #222; min-width: 170px; height: 20px; }
      .act h1 { text-align: center; margin-top: 34px; }
      .act ol { padding-left: 22px; }
      .act li { margin: 10px 0; }
    </style></head><body>${body}</body></html>`;
}

function invoiceHtml(payment: Payment, payer: PayerDetails) {
  const unitPrice = payment.unitPrice ?? payment.amount / payment.quantity;
  const contract = payer.contractNumber ? `Договор лидогенерации № ${escapeHtml(payer.contractNumber)}${payer.contractDate ? ` от ${date(payer.contractDate)}` : ''}` : 'Договор лидогенерации';
  const title = `Счет-${payment.invoiceNo ?? payment.id.slice(0, 8)}`;
  return documentShell(title, `<table class="bank"><tr><td>${SUPPLIER.bank}<br/><span class="muted">Банк получателя</span></td><td>БИК<br/><b>${SUPPLIER.bik}</b></td></tr><tr><td>ИНН ${SUPPLIER.inn}<br/><b>${SUPPLIER.name}</b><br/><span class="muted">Получатель</span></td><td>Счёт №<br/><b>${SUPPLIER.account}</b><br/>Корр. счёт ${SUPPLIER.correspondent}</td></tr></table>
    <h1>Счёт на оплату № ${escapeHtml(payment.invoiceNo ?? payment.id.slice(0, 8))} от ${date(payment.createdAt)}</h1>
    <p><b>Поставщик:</b> ${SUPPLIER.name}, ИНН ${SUPPLIER.inn}</p>
    <p><b>Покупатель:</b> ${escapeHtml(payer.organizationName)}, ИНН ${escapeHtml(payer.inn)}${payer.kpp ? `, КПП ${escapeHtml(payer.kpp)}` : ''}, юридический адрес: ${escapeHtml(payer.legalAddress || '—')}</p>
    <p><b>Основание:</b> ${contract}</p>
    <table class="items"><thead><tr><th>№</th><th>Товары (работы, услуги)</th><th>Кол-во</th><th>Ед.</th><th>НДС</th><th>Цена</th><th>Сумма</th></tr></thead><tbody><tr><td class="center">1</td><td>Услуги лидогенерации</td><td class="right">${payment.quantity}</td><td>шт.</td><td>Без НДС</td><td class="right">${money(unitPrice)}</td><td class="right">${money(payment.amount)}</td></tr></tbody></table>
    <div class="totals"><div><b>Итого:</b><b>${money(payment.amount)} ₽</b></div><div><b>Итого к оплате:</b><b>${money(payment.amount)} ₽</b></div></div>
    <p>Всего наименований 1, на сумму ${money(payment.amount)} руб.</p>
    <div class="signature"><div>Руководитель<br/><span class="line"></span> / Сушкевич Н. А.</div><div class="center">М. П.</div></div>`);
}

function actHtml(payments: Payment[], payer: PayerDetails, from: string, to: string) {
  const total = payments.reduce((sum, item) => sum + item.amount, 0);
  const quantity = payments.reduce((sum, item) => sum + item.quantity, 0);
  const contractNo = escapeHtml(payer.contractNumber || 'б/н');
  const contractDate = payer.contractDate ? date(payer.contractDate) : date(from);
  const title = `Акт-${from}-${to}`;
  return documentShell(title, `<div class="act"><h1>Акт выполненных работ № ${escapeHtml(payments.at(-1)?.invoiceNo ?? payments[0]?.id.slice(0, 8))}</h1>
    <h2 class="center">к Договору лидогенерации № ${contractNo} от ${contractDate}</h2>
    <p style="display:flex;justify-content:space-between;margin-top:20px"><span>г. Москва</span><span>${date(to)}</span></p>
    <p>${escapeHtml(payer.organizationName)}, именуемый в дальнейшем «Заказчик», с одной стороны, и ${SUPPLIER.name} (ИНН ${SUPPLIER.inn}), именуемый в дальнейшем «Исполнитель», с другой стороны, совместно именуемые «Стороны», заключили настоящий Акт о нижеследующем:</p>
    <ol><li>За период с ${date(from)} по ${date(to)} согласно Договору лидогенерации № ${contractNo} от ${contractDate} Исполнителем были предоставлены обезличенные контактные данные лиц, заинтересованных в продуктах или услугах Заказчика. Количество переданных контактных данных - ${quantity} шт.</li>
    <li>Заказчик не имеет претензий к Исполнителю по качеству и объёму оказанных услуг.</li>
    <li>Сумма вознаграждения составила ${money(total)} рублей, без НДС.</li>
    <li>Настоящий акт составлен в двух экземплярах, имеющих одинаковую юридическую силу, по одному для каждой Стороны.</li></ol>
    <div class="signature"><div><b>Подрядчик:</b><br/>${SUPPLIER.name}<br/><br/><span class="line"></span> / Сушкевич Н. А.</div><div><b>Заказчик:</b><br/>${escapeHtml(payer.organizationName)}<br/><br/><span class="line"></span> / ${escapeHtml(payer.signerName || '')}</div></div></div>`);
}

/**
 * Rasterizing this document to a canvas (SVG+foreignObject → canvas.toBlob) reliably
 * throws "Tainted canvases may not be exported" in real Chrome — foreignObject/HTML
 * content taints the canvas regardless of same-origin. Print-to-PDF via the browser's
 * own dialog has no such restriction and needs no extra dependencies.
 */
function printDocument(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    let settled = false;
    const cleanup = () => { iframe.remove(); };
    const settle = (fn: () => void) => { if (settled) return; settled = true; cleanup(); fn(); };
    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (!win) { settle(() => reject(new Error('Не удалось подготовить документ для печати'))); return; }
      win.addEventListener('afterprint', () => settle(resolve));
      // Some browsers (notably Safari) never fire afterprint for an iframe's
      // contentWindow — fall back to resolving once the dialog has had time to open.
      setTimeout(() => settle(resolve), 60_000);
      win.focus();
      win.print();
    };
    document.body.append(iframe);
    iframe.srcdoc = html;
  });
}

export function downloadInvoicePdf(payment: Payment, payer: PayerDetails) { return printDocument(invoiceHtml(payment, payer)); }
export function downloadClosingActPdf(payments: Payment[], payer: PayerDetails, from: string, to: string) { return printDocument(actHtml(payments, payer, from, to)); }
