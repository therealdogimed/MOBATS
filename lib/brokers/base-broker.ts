export interface BrokerConfig {
  id: string
  name: string
  type: string
  apiKey: string
  apiSecret: string
  mode?: 'paper' | 'live'
  apiEndpoint?: string
  additionalConfig?: Record<string, any>
}

export interface Position {
  symbol: string
  qty: number
  side: 'long' | 'short'
  entryPrice: number
  currentPrice: number
  unrealizedPL: number
  unrealizedPLPercent: number
}

export interface Account {
  equity: number
  buyingPower: number
  cash: number
  marginUsed?: number
  status: string
}

export interface Order {
  symbol: string
  qty: number
  side: 'buy' | 'sell'
  type: 'market' | 'limit' | 'stop' | 'stop_limit'
  timeInForce: 'day' | 'gtc' | 'ioc' | 'fok'
  limitPrice?: number
  stopPrice?: number
}

export interface OrderResult {
  id: string
  status: string
  symbol: string
  qty: number
  side: string
  filledQty?: number
  avgFillPrice?: number
}

export abstract class BaseBroker {
  protected config: BrokerConfig
  protected isConfigured: boolean = false

  constructor(config: BrokerConfig) {
    this.config = config
    // Consider broker configured if at least one key exists
    this.isConfigured = !!(config.apiKey || config.apiSecret)
  }

  /**
   * Attempts to verify both live and paper accounts.
   * Returns any successful accounts and a list of errors.
   */
  async safeVerifyConnection(): Promise<{ live?: Account; paper?: Account; errors?: string[] }> {
    const results: { live?: Account; paper?: Account; errors?: string[] } = { errors: [] }

    const modes: ('live' | 'paper')[] = ['live', 'paper']

    for (const mode of modes) {
      try {
        const account = await this.verifyConnectionMode(mode)
        if (mode === 'live') results.live = account
        if (mode === 'paper') results.paper = account
      } catch (err: any) {
        results.errors?.push(`Error verifying ${mode} account: ${err?.message || err}`)
      }
    }

    return results
  }

  /**
   * Concrete brokers should implement this instead of verifyConnection directly.
   * Allows safeVerifyConnection to loop over modes.
   */
  abstract verifyConnectionMode(mode: 'live' | 'paper'): Promise<Account>

  /** @deprecated use verifyConnectionMode + safeVerifyConnection */
  abstract verifyConnection(): Promise<{ success: boolean; account?: Account; error?: string }>

  abstract getAccount(): Promise<Account>
  abstract getPositions(): Promise<Position[]>
  abstract getMarketPrice(symbol: string): Promise<number>
  abstract placeOrder(order: Order): Promise<OrderResult>
  abstract cancelOrder(orderId: string): Promise<void>
  abstract cancelAllOrders(): Promise<void>
  abstract closePosition(symbol: string): Promise<void>
  abstract closeAllPositions(): Promise<void>
  abstract isMarketOpen(): Promise<boolean>

  getConfig(): BrokerConfig {
    return { ...this.config }
  }

  isReady(): boolean {
    return this.isConfigured
  }
}
