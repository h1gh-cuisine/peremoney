import { useFinanceStore } from './useFinanceStore';

describe('finance store isolation', () => {
  it('clears project finance data when leaving the project cabinet', () => {
    useFinanceStore.setState({
      cabinetId: 'cabinet-a', moneyBalance: 12500,
      unitBalance: { usedUnits: 35, totalUnits: 200 },
      payments: [{ id: 'payment', amount: 1000, quantity: 10, status: 'paid', createdAt: '2026-08-26' }],
      loading: true, error: 'old error',
    });

    useFinanceStore.getState().reset();

    expect(useFinanceStore.getState()).toMatchObject({
      cabinetId: null, moneyBalance: 0, unitBalance: { usedUnits: 0, totalUnits: 0 },
      payments: [], loading: false, error: null,
    });
  });
});
