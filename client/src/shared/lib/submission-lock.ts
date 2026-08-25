export class SubmissionLock {
  private pending = false;
  get isPending() { return this.pending; }
  async run<T>(operation: () => Promise<T>): Promise<T | undefined> {
    if (this.pending) return undefined;
    this.pending = true;
    try { return await operation(); } finally { this.pending = false; }
  }
}
