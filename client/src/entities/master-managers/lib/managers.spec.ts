import { managersFromProjectNames } from './managers';
describe('managersFromProjectNames', () => {
  it('builds a stable unique directory from real project manager names', () => {
    expect(managersFromProjectNames(['Анна', 'Без менеджера', 'Анна', 'Борис']))
      .toEqual([{ id: 'Анна', name: 'Анна' }, { id: 'Без менеджера', name: 'Без менеджера' }, { id: 'Борис', name: 'Борис' }]);
  });
});
