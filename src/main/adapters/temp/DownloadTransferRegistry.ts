interface TransferEntry {
  localPath: string
  /** Aborts the transfer; resolves only once its partial file has been unlinked. */
  abort: () => Promise<void>
}

export class DownloadTransferRegistry {
  private transfers = new Map<string, TransferEntry>()

  register(transferId: string, entry: TransferEntry): void {
    this.transfers.set(transferId, entry)
  }

  unregister(transferId: string): void {
    this.transfers.delete(transferId)
  }

  async cancel(transferId: string): Promise<void> {
    const entry = this.transfers.get(transferId)
    if (!entry) return
    await entry.abort()
  }

  async cancelAll(): Promise<void> {
    const entries = [...this.transfers.values()]
    await Promise.all(entries.map((entry) => entry.abort()))
  }

  hasActive(): boolean {
    return this.transfers.size > 0
  }
}
