import { BaseBroker, type BrokerConfig, type Account, type Position, type Order, type OrderResult } from './base-broker'

interface AlpacaAccount {
  account_number: string
  status: string
  equity: string
  buying_power: string
  cash: string
  portfolio_value: string
  pattern_day_trader: boolean
  trading_blocked: boolean
}

interface AlpacaPosition {
  symbol: string
  qty: string
  side: string
  market_value: string
  avg_entry_price: string
  current_price: string
  unrealized_pl: string
  unrealized_plpc: string
}

export class AlpacaBroker extends BaseBroker {
  private baseUrl: string
  private dataUrl: string = 'https://data.alpaca.markets'

  constructor(config: BrokerConfig) {
    super(config)
    this.baseUrl = config.mode === 'live'
      ? 'https://api.alpaca.markets'
      : 'https://paper-api.alpaca.markets'
  }

  private getHeaders(): HeadersInit {
    return {
      'APCA-API-KEY-ID': this.config.apiKey,
      'APCA-API-SECRET-KEY': this.config.apiSecret,
      'Content-Type': 'application/json'
    }
  }

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: { ...this.getHeaders(), ...options?.headers }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Alpaca API error (${response.status}): ${error}`)
    }

    return response.json()
  }

  /** Verifies both live and paper accounts gracefully */
  async verifyConnectionMode(mode: 'live' | 'paper'): Promise<Account> {
    try {
      const account = await this.getAccount(mode)
      return account
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : `Failed to verify ${mode} account`)
    }
  }

  /** @deprecated - keep for backward compatibility */
  async verifyConnection(): Promise<{ success: boolean; account?: Account; error?: string }> {
    try {
      const account = await this.getAccount()
      return { success: true, account }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  async getAccount(mode?: 'live' | 'paper'): Promise<Account> {
    const url = `${this.baseUrl}/v2/account` + (mode ? `?mode=${mode}` : '')
    const data = await this.request<AlpacaAccount>(url)

    const equity = parseFloat(data.equity)
    const buyingPower = parseFloat(data.buying_power)
    const cash = parseFloat(data.cash)

    return {
      equity,
      buyingPower,
      cash,
      status: data.status
    }
  }

  async getPositions(): Promise<Position[]> {
    const data = await this.request<AlpacaPosition[]>(`${this.baseUrl}/v2/positions`)
    return data.map(p => ({
      symbol: p.symbol,
      qty: parseFloat(p.qty),
      side: p.side === 'long' ? 'long' : 'short',
      entryPrice: parseFloat(p.avg_entry_price),
      currentPrice: parseFloat(p.current_price),
      unrealizedPL: parseFloat(p.unrealized_pl),
      unrealizedPLPercent: parseFloat(p.unrealized_plpc) * 100
    }))
  }

  async getMarketPrice(symbol: string): Promise<number> {
    const data = await this.request<any>(`${this.dataUrl}/v2/stocks/${symbol}/quotes/latest?feed=iex`)
    return (data.quote.ap + data.quote.bp) / 2
  }

  async placeOrder(order: Order): Promise<OrderResult> {
    const result = await this.request<any>(`${this.baseUrl}/v2/orders`, {
      method: 'POST',
      body: JSON.stringify({
        symbol: order.symbol,
        qty: order.qty.toString(),
        side: order.side,
        type: order.type,
        time_in_force: order.timeInForce,
        limit_price: order.limitPrice?.toString(),
        stop_price: order.stopPrice?.toString()
      })
    })

    return {
      id: result.id,
      status: result.status,
      symbol: result.symbol,
      qty: parseFloat(result.qty),
      side: result.side,
      filledQty: result.filled_qty ? parseFloat(result.filled_qty) : undefined,
      avgFillPrice: result.filled_avg_price ? parseFloat(result.filled_avg_price) : undefined
    }
  }

  async cancelOrder(orderId: string): Promise<void> {
    await this.request(`${this.baseUrl}/v2/orders/${orderId}`, { method: 'DELETE' })
  }

  async cancelAllOrders(): Promise<void> {
    await this.request(`${this.baseUrl}/v2/orders`, { method: 'DELETE' })
  }

  async closePosition(symbol: string): Promise<void> {
    await this.request(`${this.baseUrl}/v2/positions/${symbol}`, { method: 'DELETE' })
  }

  async closeAllPositions(): Promise<void> {
    await this.request(`${this.baseUrl}/v2/positions`, { method: 'DELETE' })
  }

  async isMarketOpen(): Promise<boolean> {
    const clock = await this.request<{ is_open: boolean }>(`${this.baseUrl}/v2/clock`)
    return clock.is_open
  }
}
