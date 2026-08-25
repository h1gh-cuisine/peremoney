import { SubmissionLock } from './submission-lock';
describe('SubmissionLock', () => {
  it('drops a duplicate while pending and unlocks after completion', async () => {
    const lock = new SubmissionLock(); let release!: () => void; let calls = 0;
    const operation = () => { calls += 1; return new Promise<void>((resolve) => { release = resolve; }); };
    const first = lock.run(operation); const duplicate = lock.run(operation);
    expect(calls).toBe(1); expect(await duplicate).toBeUndefined(); release(); await first;
    await lock.run(async () => { calls += 1; }); expect(calls).toBe(2);
  });
  it('unlocks after rejection', async () => {
    const lock = new SubmissionLock(); await expect(lock.run(async () => { throw new Error('fail'); })).rejects.toThrow('fail');
    await expect(lock.run(async () => 42)).resolves.toBe(42);
  });
});
