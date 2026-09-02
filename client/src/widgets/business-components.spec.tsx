import { renderToStaticMarkup } from 'react-dom/server';
import { ContactsTable } from './contacts-table/ContactsTable';
import { PaymentsTable } from './payments-table/PaymentsTable';
import { ScriptViewer } from './script-viewer/ScriptViewer';
import { MasterPaymentsTable } from './master-payments-table/MasterPaymentsTable';

describe('UI-контракты из требований 1.5, 1.8, 1.9', () => {
  it('таблица контактов имеет ровно нужные бизнес-колонки', () => {
    const html = renderToStaticMarkup(<ContactsTable contacts={[]} />);
    for (const header of ['Дата', 'Статус', 'Номер телефона', 'Источник', 'Оператор связи']) expect(html).toContain(`<th>${header}</th>`);
    expect((html.match(/<th>/g) ?? [])).toHaveLength(5);
    expect(html).toContain('Нет контактов за выбранный период');
  });

  it('клиентские платежи рендерятся без кнопок изменения/удаления', () => {
    const html = renderToStaticMarkup(<PaymentsTable payments={[{ id: 'p', amount: 1500, quantity: 1, status: 'pending', createdAt: '2026-08-20' }]} />);
    expect(html).toContain('Ожидает');
    expect(html).not.toContain('<button');
  });

  it('статус мастер-платежа меняется через явный выпадающий список, а не одним кликом по бейджу', () => {
    const html = renderToStaticMarkup(<MasterPaymentsTable
      payments={[{
        id: 'p', projectId: 'project', projectName: 'Тестовый проект', legalEntity: 'ООО Тест',
        amount: 1500, managerId: 'manager', status: 'pending', createdAt: '2026-08-20',
      }]}
      managers={[]}
      onStatusChange={() => undefined}
      onDelete={() => undefined}
    />);

    expect(html).toContain('<select');
    expect(html).toContain('aria-label="Статус платежа Тестовый проект"');
    expect(html).toContain('<option value="pending" selected="">Ожидает</option>');
    expect(html).toContain('<option value="paid">Оплачено</option>');
    expect(html).not.toContain('title="Переключить статус"');
  });

  it('скрипт только читается и рендерится как обычный текст', () => {
    const html = renderToStaticMarkup(<ScriptViewer data={{ projectId: '42', name: 'Скрипт', script: 'Привет\nШаг 2', updatedAt: '2026-08-20' }} />);
    expect(html).toContain('<article');
    expect(html).toContain('Привет\nШаг 2');
    expect(html).not.toContain('>Скрипт</h2>');
    expect(html).not.toContain('<iframe');
    expect(html).toContain('Только чтение');
    for (const forbidden of ['Редактировать', 'Сгенерировать AI', 'История']) expect(html).not.toContain(forbidden);
  });

  it('корректно показывает ISO datetime обновления скрипта', () => {
    expect(() => renderToStaticMarkup(<ScriptViewer data={{
      projectId: '42', name: 'Скрипт', script: '<p>Привет</p>', updatedAt: '2026-08-20T15:30:00.000Z',
    }} />)).not.toThrow();
  });

  it.each(['', 'null'])('показывает пустое состояние вместо текста для скрипта %p', (script) => {
    const html = renderToStaticMarkup(<ScriptViewer data={{
      projectId: '42', name: 'Пустой проект', script, updatedAt: '2026-08-20',
    }} />);

    expect(html).toContain('Скрипт для проекта не настроен');
    expect(html).not.toContain('<iframe');
  });
});
