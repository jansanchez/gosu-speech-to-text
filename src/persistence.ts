/** Serial, failure-recoverable writes. Values must be immutable snapshots. */
export class SerialWriter<T> {
  private chain: Promise<void> = Promise.resolve();
  private revision = 0;

  constructor(
    private write: (value: T) => Promise<void>,
    private status: (saved: boolean, error?: unknown) => void = () => {},
  ) {}

  save(value: T): Promise<void> {
    const revision = ++this.revision;
    this.status(false);
    const result = this.chain.catch(() => {}).then(() => this.write(value));
    this.chain = result;
    // Attach the rejection handler here even when the caller uses fire-and-forget.
    void result.then(
      () => {
        if (revision === this.revision) this.status(true);
      },
      (error) => {
        if (revision === this.revision) this.status(false, error);
      },
    );
    return result;
  }

  flush(): Promise<void> {
    return this.chain;
  }
}
