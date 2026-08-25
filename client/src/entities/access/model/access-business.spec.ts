import { CLIENT_NAV_ITEMS } from '@/widgets/sidebar/nav-config';
import { useAccessStore } from './useAccessStore';

describe('видимость UI: бизнес-правила 1.2–1.3', () => {
  beforeEach(() => useAccessStore.setState({
    accessLevel: 'full',
    sectionVisibility: { contacts: true, sources: true, script: true, finance: true, settings: true },
    draftSectionVisibility: { contacts: true, sources: true, script: true, finance: true, settings: true },
  }));

  it('не позволяет скрывать дашборд, лиды и плательщика', () => {
    expect(CLIENT_NAV_ITEMS.filter((item) => item.alwaysVisible).map((item) => item.id)).toEqual(['dashboard', 'leads', 'payer']);
  });

  it('full видит раздел даже при false в флаге', () => {
    useAccessStore.setState({ accessLevel: 'full', sectionVisibility: { ...useAccessStore.getState().sectionVisibility, contacts: false } });
    expect(useAccessStore.getState().isSectionVisible('contacts')).toBe(true);
  });

  it('limited видит только разрешённые скрываемые разделы', () => {
    useAccessStore.setState({ accessLevel: 'limited', sectionVisibility: { ...useAccessStore.getState().sectionVisibility, finance: false } });
    expect(useAccessStore.getState().isSectionVisible('finance')).toBe(false);
    expect(useAccessStore.getState().isSectionVisible('contacts')).toBe(true);
  });

  it('черновик не влияет до нажатия сохранить', () => {
    const store = useAccessStore.getState();
    store.setAccessLevel('limited'); store.setDraftSectionVisibility('sources', false);
    expect(useAccessStore.getState().isSectionVisible('sources')).toBe(true);
    useAccessStore.getState().commitVisibilityDraft();
    expect(useAccessStore.getState().isSectionVisible('sources')).toBe(false);
  });
});
