import { getProjectMenuPosition } from './ProjectRowMenu';

describe('project row menu viewport positioning', () => {
  it('keeps the menu inside the right edge of the viewport', () => {
    expect(getProjectMenuPosition(
      { left: 1160, right: 1270, top: 200, bottom: 232 } as DOMRect,
      { width: 1280, height: 720 },
    )).toEqual({ left: 1110, top: 236 });
  });

  it('opens upward when there is no room below the trigger', () => {
    expect(getProjectMenuPosition(
      { left: 900, right: 1010, top: 680, bottom: 712 } as DOMRect,
      { width: 1024, height: 720 },
    )).toEqual({ left: 850, top: 524 });
  });

  it('never returns a negative left coordinate on an extremely narrow viewport', () => {
    expect(getProjectMenuPosition(
      { left: 10, right: 70, top: 100, bottom: 132 } as DOMRect,
      { width: 120, height: 400 },
    ).left).toBe(8);
  });
});
