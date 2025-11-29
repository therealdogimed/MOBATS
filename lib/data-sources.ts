export interface DataSource {
  id: string
  name: string
  type: "market" | "news" | "signals" | "sentiment" | "fundamentals"
  apiKey?: string
  endpoint?: string
  enabled: boolean
  lastFetch?: string
  errorCount: number
}

export interface SignalData {
  symbol: string
  signal: "buy" | "sell" | "hold"
  strength: number // 0-100
  source: string
  timestamp: string
  metadata?: Record<string, any>
}

class DataSourceManager {
  private sources: Map<string, DataSource> = new Map()
  private signalCache: Map<string, SignalData[]> = new Map()
  private readonly MAX_ERROR_COUNT = 5
  private readonly CACHE_TTL = 60000 // 1 minute

  async addSource(source: DataSource): Promise<void> {
    console.log(`[v0] Adding data source: ${source.name}`)
    this.sources.set(source.id, source)
  }

  async removeSource(id: string): Promise<void> {
    console.log(`[v0] Removing data source: ${id}`)
    this.sources.delete(id)
    this.signalCache.delete(id)
  }

  async fetchSignals(symbol: string): Promise<SignalData[]> {
    const allSignals: SignalData[] = []

    for (const [id, source] of this.sources.entries()) {
      if (!source.enabled || source.errorCount >= this.MAX_ERROR_COUNT) {
        continue
      }

      try {
        const signals = await this.fetchFromSource(source, symbol)
        allSignals.push(...signals)

        // Reset error count on success
        source.errorCount = 0
        source.lastFetch = new Date().toISOString()
      } catch (error) {
        console.error(`[v0] Data source ${source.name} error:`, error)
        source.errorCount++

        // Auto-disable after max errors
        if (source.errorCount >= this.MAX_ERROR_COUNT) {
          console.log(`[v0] Disabling data source ${source.name} due to repeated errors`)
          source.enabled = false
        }
      }
    }

    // Cache signals
    this.signalCache.set(symbol, allSignals)

    return allSignals
  }

  private async fetchFromSource(source: DataSource, symbol: string): Promise<SignalData[]> {
    // Placeholder - implement actual API calls based on source type
    return []
  }

  getCachedSignals(symbol: string): SignalData[] {
    return this.signalCache.get(symbol) || []
  }

  getSources(): DataSource[] {
    return Array.from(this.sources.values())
  }
}

let dataSourceManagerInstance: DataSourceManager | null = null

export function getDataSourceManager(): DataSourceManager {
  if (!dataSourceManagerInstance) {
    dataSourceManagerInstance = new DataSourceManager()
  }
  return dataSourceManagerInstance
}
