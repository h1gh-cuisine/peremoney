import { projectDisplayName } from './MasterProjectsTable';

describe('projectDisplayName', () => {
  it('shows only the project name from the Leads Factory path', () => {
    expect(projectDisplayName('РФ/Peremoney ЛКП VDL/тест06/тест06')).toBe('тест06');
  });

  it('keeps an ordinary project name unchanged', () => {
    expect(projectDisplayName('тест06')).toBe('тест06');
  });
});
