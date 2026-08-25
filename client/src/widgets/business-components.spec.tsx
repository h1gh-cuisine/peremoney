import { renderToStaticMarkup } from 'react-dom/server';
import { ContactsTable } from './contacts-table/ContactsTable';
import { PaymentsTable } from './payments-table/PaymentsTable';
import { ScriptViewer } from './script-viewer/ScriptViewer';

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

  it('скрипт только читается и рендерит provider HTML', () => {
    const html = renderToStaticMarkup(<ScriptViewer data={{ projectId: '42', name: 'Скрипт', script: '<p><strong>Привет</strong></p>', updatedAt: '2026-08-20' }} />);
    expect(html).toContain('<iframe');
    expect(html).toContain('sandbox=""');
    expect(html).toContain('srcDoc="&lt;p&gt;&lt;strong&gt;Привет&lt;/strong&gt;&lt;/p&gt;"');
    expect(html).toContain('Только чтение');
    for (const forbidden of ['Редактировать', 'Сгенерировать AI', 'История']) expect(html).not.toContain(forbidden);
  });

  it('корректно показывает ISO datetime обновления скрипта', () => {
    expect(() => renderToStaticMarkup(<ScriptViewer data={{
      projectId: '42', name: 'Скрипт', script: '<p>Привет</p>', updatedAt: '2026-08-20T15:30:00.000Z',
    }} />)).not.toThrow();
  });

  it.each(['', 'null'])('показывает пустое состояние вместо iframe для скрипта %p', (script) => {
    const html = renderToStaticMarkup(<ScriptViewer data={{
      projectId: '42', name: 'Пустой проект', script, updatedAt: '2026-08-20',
    }} />);

    expect(html).toContain('Скрипт для проекта не настроен');
    expect(html).not.toContain('<iframe');
  });
});
