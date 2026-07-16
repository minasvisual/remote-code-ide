interface SearchEntry {
  /** Aborts the search; resolves once the underlying walk has settled. */
  abort: () => Promise<void>
}

export class SearchTransferRegistry {
  private searches = new Map<string, SearchEntry>()

  register(searchId: string, entry: SearchEntry): void {
    this.searches.set(searchId, entry)
  }

  unregister(searchId: string): void {
    this.searches.delete(searchId)
  }

  async cancel(searchId: string): Promise<void> {
    const entry = this.searches.get(searchId)
    if (!entry) return
    await entry.abort()
  }
}
