import type { PayerDetails } from '@/entities/payer';
import type { Payment } from '@/entities/finance';

const A4 = { width: 1240, height: 1754 };
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

function documentShell(body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${A4.width}" height="${A4.height}">
    <foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">
      <style>*{box-sizing:border-box}body{margin:0}.page{width:${A4.width}px;height:${A4.height}px;padding:105px 95px;color:#111;background:#fff;font-family:Arial,sans-serif;font-size:23px;line-height:1.38}.muted{font-size:19px}.right{text-align:right}.center{text-align:center}h1{font-size:34px;margin:40px 0 30px}h2{font-size:30px;margin:0 0 22px}p{margin:10px 0}.bank{width:100%;border-collapse:collapse}.bank td{border:2px solid #222;padding:8px 11px;vertical-align:top}.items{width:100%;border-collapse:collapse;margin:28px 0 12px}.items th,.items td{border:2px solid #222;padding:9px 10px}.items th{font-size:19px}.totals{margin-left:auto;width:48%;font-size:24px}.totals div{display:flex;justify-content:space-between;padding:5px 0}.signature{display:grid;grid-template-columns:1fr 1fr;gap:90px;margin-top:75px}.line{display:inline-block;border-bottom:1px solid #222;min-width:230px;height:30px}.act{font-size:24px}.act h1{text-align:center;margin-top:70px}.act ol{padding-left:30px}.act li{margin:16px 0}</style>
      <div class="page">${body}</div></div></foreignObject></svg>`;
}

function invoiceHtml(payment: Payment, payer: PayerDetails) {
  const unitPrice = payment.unitPrice ?? payment.amount / payment.quantity;
  const contract = payer.contractNumber ? `Договор лидогенерации № ${escapeHtml(payer.contractNumber)}${payer.contractDate ? ` от ${date(payer.contractDate)}` : ''}` : 'Договор лидогенерации';
  return documentShell(`<table class="bank"><tr><td>${SUPPLIER.bank}<br/><span class="muted">Банк получателя</span></td><td>БИК<br/><b>${SUPPLIER.bik}</b></td></tr><tr><td>ИНН ${SUPPLIER.inn}<br/><b>${SUPPLIER.name}</b><br/><span class="muted">Получатель</span></td><td>Счёт №<br/><b>${SUPPLIER.account}</b><br/>Корр. счёт ${SUPPLIER.correspondent}</td></tr></table>
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
  return documentShell(`<div class="act"><h1>Акт выполненных работ № ${escapeHtml(payments.at(-1)?.invoiceNo ?? payments[0]?.id.slice(0, 8))}</h1>
    <h2 class="center">к Договору лидогенерации № ${contractNo} от ${contractDate}</h2>
    <p style="display:flex;justify-content:space-between;margin-top:45px"><span>г. Москва</span><span>${date(to)}</span></p>
    <p>${escapeHtml(payer.organizationName)}, именуемый в дальнейшем «Заказчик», с одной стороны, и ${SUPPLIER.name} (ИНН ${SUPPLIER.inn}), именуемый в дальнейшем «Исполнитель», с другой стороны, совместно именуемые «Стороны», заключили настоящий Акт о нижеследующем:</p>
    <ol><li>За период с ${date(from)} по ${date(to)} согласно Договору лидогенерации № ${contractNo} от ${contractDate} Исполнителем были предоставлены обезличенные контактные данные лиц, заинтересованных в продуктах или услугах Заказчика. Количество переданных контактных данных - ${quantity} шт.</li>
    <li>Заказчик не имеет претензий к Исполнителю по качеству и объёму оказанных услуг.</li>
    <li>Сумма вознаграждения составила ${money(total)} рублей, без НДС.</li>
    <li>Настоящий акт составлен в двух экземплярах, имеющих одинаковую юридическую силу, по одному для каждой Стороны.</li></ol>
    <div class="signature"><div><b>Подрядчик:</b><br/>${SUPPLIER.name}<br/><br/><span class="line"></span> / Сушкевич Н. А.</div><div><b>Заказчик:</b><br/>${escapeHtml(payer.organizationName)}<br/><br/><span class="line"></span> / ${escapeHtml(payer.signerName || '')}</div></div></div>`);
}

async function svgToJpeg(svg: string) {
  const image = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Не удалось отрисовать документ')); image.src = url; });
    const canvas = document.createElement('canvas'); canvas.width = A4.width; canvas.height = A4.height;
    const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas недоступен');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Не удалось создать PDF')), 'image/jpeg', .95));
    return new Uint8Array(await blob.arrayBuffer());
  } finally { URL.revokeObjectURL(url); }
}

function jpegPdf(jpeg: Uint8Array) {
  const encoder = new TextEncoder(); const chunks: Uint8Array[] = []; const offsets: number[] = [0]; let size = 0;
  const add = (value: string | Uint8Array) => { const bytes = typeof value === 'string' ? encoder.encode(value) : value; chunks.push(bytes); size += bytes.length; };
  add('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');
  const object = (id: number, body: string | Uint8Array, suffix = '') => { offsets[id] = size; add(`${id} 0 obj\n`); add(body); add(`${suffix}\nendobj\n`); };
  object(1, '<< /Type /Catalog /Pages 2 0 R >>'); object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
  offsets[4] = size; add(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${A4.width} /Height ${A4.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`); add(jpeg); add('\nendstream\nendobj\n');
  const content = 'q 595 0 0 842 0 0 cm /Im0 Do Q'; object(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  const xref = size; add('xref\n0 6\n0000000000 65535 f \n'); for (let id = 1; id <= 5; id += 1) add(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks, { type: 'application/pdf' });
}

async function download(svg: string, filename: string) {
  const blob = jpegPdf(await svgToJpeg(svg)); const url = URL.createObjectURL(blob);
  try { const link = document.createElement('a'); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); }
  finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

export function downloadInvoicePdf(payment: Payment, payer: PayerDetails) { return download(invoiceHtml(payment, payer), `Счет-${payment.invoiceNo ?? payment.id}.pdf`); }
export function downloadClosingActPdf(payments: Payment[], payer: PayerDetails, from: string, to: string) { return download(actHtml(payments, payer, from, to), `Акт-${from}-${to}.pdf`); }
