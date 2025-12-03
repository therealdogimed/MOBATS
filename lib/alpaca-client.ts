import type { AlpacaAccount as AlpacaAccountType } from "./alpaca-client"

interface AlpacaPosition {
  symbol: string
  qty: string
  market_value: string
  unrealized_pl: string
  unrealized_plpc: string
}

interface AlpacaClock {
  is_open: boolean
  timestamp: string
  next_open: string
  next_close: string
}

interface AlpacaQuote {
  ap: number // ask price
  bp: number // bid price
  as: number // ask size
  bs: number // bid size
}

interface AlpacaBar {
  t: string // timestamp
  o: number // open
  h: number // high
  l: number // low
  c: number // close
  v: number // volume
}

interface OrderRequest {
  symbol: string
  qty: string
  side: "buy" | "sell"
  type: "market" | "limit" | "stop" | "stop_limit"
  time_in_force: "day" | "gtc" | "opg" | "cls" | "ioc" | "fok"
  limit_price?: string
  stop_price?: string
}

export class AlpacaClient {
  private baseUrl: string
  private dataUrl: string
  private apiKey: string
  private apiSecret: string
  private hasCredentials: boolean
  private mode: "paper" | "live"
  private lastVerification: { success: boolean; timestamp: number; account?: any } | null = null

  constructor(apiKey?: string, apiSecret?: string, mode?: "paper" | "live") {
    this.apiKey = apiKey || process.env.ALPACA_API_KEY || ""
    this.apiSecret = apiSecret || process.env.ALPACA_API_SECRET || ""
    this.hasCredentials = !!(this.apiKey && this.apiSecret)

    this.mode = mode || (process.env.ALPACA_MODE === "live" ? "live" : "paper")

    this.baseUrl = this.mode === "paper" ? "https://paper-api.alpaca.markets" : "https://api.alpaca.markets"
    this.dataUrl = "https://data.alpaca.markets"

    console.log("[v0] Alpaca: Client initialized", {
      mode: this.mode.toUpperCase(),
      baseUrl: this.baseUrl,
      hasCredentials: this.hasCredentials,
      credentialSource: apiKey ? "broker config" : "environment variables",
    })
  }

  public isConfigured(): boolean {
    return this.hasCredentials
  }

  public getMode(): "paper" | "live" {
    return this.mode
  }

  public async verifyConnection(): Promise<{ success: boolean; account?: any; error?: string }> {
    if (!this.hasCredentials) {
      return { success: false, error: "No credentials configured" }
    }

    try {
      console.log("[v0] Alpaca: Verifying connection...", { mode: this.mode })

      const account = await this.getAccount()

      console.log("[v0] Alpaca: Connection verified successfully", {
        accountNumber: account.account_number,
        status: account.status,
        mode: this.mode,
        equity: account.equity,
        buyingPower: account.buying_power,
        tradingBlocked: account.trading_blocked,
        patternDayTrader: account.pattern_day_trader,
      })

      this.lastVerification = {
        success: true,
        timestamp: Date.now(),
        account,
      }

      return { success: true, account }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error("[v0] Alpaca: Connection verification failed", {
        mode: this.mode,
        error: errorMsg,
      })

      this.lastVerification = {
        success: false,
        timestamp: Date.now(),
      }

      return { success: false, error: errorMsg }
    }
  }

  public getLastVerification() {
    return this.lastVerification
  }

  private getHeaders(): HeadersInit {
    console.log("[v0] Alpaca: Request headers", {
      hasKeyId: !!this.apiKey,
      hasSecret: !!this.apiSecret,
      keyIdPrefix: this.apiKey?.substring(0, 8) + "...",
    })

    return {
      "APCA-API-KEY-ID": this.apiKey,
      "APCA-API-SECRET-KEY": this.apiSecret,
      "Content-Type": "application/json",
    }
  }

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    if (!this.hasCredentials) {
      throw new Error("Alpaca API credentials not configured")
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options?.headers,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] Alpaca: API error", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          url,
        })
        throw new Error(`Alpaca API error (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error("[v0] Alpaca: Request failed", { url, error })
      throw error
    }
  }

  async getAccount(): Promise<AlpacaAccountType> {
    const account = await this.request<AlpacaAccountType>(`${this.baseUrl}/v2/account`)
    return account
  }

  async getPositions(): Promise<AlpacaPosition[]> {
    return this.request<AlpacaPosition[]>(`${this.baseUrl}/v2/positions`)
  }

  async getClock(): Promise<AlpacaClock> {
    const clock = await this.request<AlpacaClock>(`${this.baseUrl}/v2/clock`)
    return clock
  }

  async getQuote(symbol: string): Promise<AlpacaQuote> {
    return this.request<AlpacaQuote>(`${this.dataUrl}/v2/stocks/${symbol}/quotes/latest`)
  }

  async getLatestBars(symbols: string[]): Promise<Record<string, AlpacaBar>> {
    const symbolsStr = symbols.join(",")
    const url = `${this.dataUrl}/v2/stocks/bars/latest?symbols=${symbolsStr}&feed=iex`

    const data = await this.request<{ bars: Record<string, AlpacaBar> }>(url)
    return data.bars
  }

  async getLatestQuote(symbol: string): Promise<AlpacaQuote> {
    const url = `${this.dataUrl}/v2/stocks/${symbol}/quotes/latest?feed=iex`
    const data = await this.request<{ quote: AlpacaQuote }>(url)
    return data.quote
  }

  async createOrder(order: OrderRequest): Promise<any> {
    console.log("[v0] Alpaca: Preparing to place order", {
      symbol: order.symbol,
      qty: order.qty,
      side: order.side,
      type: order.type,
      time_in_force: order.time_in_force,
      mode: this.mode,
      baseUrl: this.baseUrl,
    })

    if (!this.hasCredentials) {
      throw new Error("Alpaca API credentials not configured")
    }

    try {
      const clock = await this.getClock()
      const now = new Date()

      if (!clock.is_open) {
        const nextOpen = new Date(clock.next_open)
        const hoursUntilOpen = ((nextOpen.getTime() - now.getTime()) / (1000 * 60 * 60)).toFixed(1)

        console.warn("[v0] Alpaca: ⚠️ MARKET IS CLOSED - Order will be queued", {
          currentTime: now.toISOString(),
          nextOpen: clock.next_open,
          hoursUntilOpen,
          message: "This order will NOT execute until market opens at 9:30 AM ET",
        })

        // Return warning but allow order to be queued
      } else {
        console.log("[v0] Alpaca: ✅ Market is OPEN - Order will execute immediately")
      }
    } catch (error) {
      console.warn("[v0] Alpaca: Could not check market hours", error)
    }

    try {
      const account = await this.getAccount()
      console.log("[v0] Alpaca: Account status before order", {
        accountNumber: account.account_number,
        equity: account.equity,
        buyingPower: account.buying_power,
        cash: account.cash,
        tradingBlocked: account.trading_blocked,
        status: account.status,
      })

      if (account.trading_blocked) {
        throw new Error("❌ Trading is blocked on this account")
      }

      const buyingPower = Number.parseFloat(account.buying_power)
      if (buyingPower <= 0) {
        throw new Error(`❌ Insufficient buying power: $${buyingPower}`)
      }
    } catch (error) {
      console.error("[v0] Alpaca: Account check failed before order", error)
      throw error
    }

    try {
      const result = await this.request(`${this.baseUrl}/v2/orders`, {
        method: "POST",
        body: JSON.stringify(order),
      })

      console.log("[v0] Alpaca: ✅ Order placed successfully", {
        orderId: result.id,
        status: result.status,
        symbol: result.symbol,
        qty: result.qty,
        side: result.side,
        submittedAt: result.submitted_at,
        mode: this.mode,
      })
      return result
    } catch (error) {
      console.error("[v0] Alpaca: ❌ Order placement failed", {
        order,
        mode: this.mode,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async cancelAllOrders(): Promise<any> {
    return this.request(`${this.baseUrl}/v2/orders`, {
      method: "DELETE",
    })
  }

  async closeAllPositions(): Promise<any> {
    return this.request(`${this.baseUrl}/v2/positions`, {
      method: "DELETE",
    })
  }

  async isMarketOpen(): Promise<boolean> {
    try {
      const clock = await this.getClock()
      return clock.is_open
    } catch (error) {
      console.error("[v0] Alpaca: Failed to check market hours", error)
      return false
    }
  }

  async getHistoricalBars(symbol: string, timeframe: string, start: string, end: string): Promise<AlpacaBar[]> {
    const url = `${this.dataUrl}/v2/stocks/${symbol}/bars?timeframe=${timeframe}&start=${start}&end=${end}&feed=iex`
    const data = await this.request<{ bars: AlpacaBar[] }>(url)
    return data.bars || []
  }

  async getRealtimeQuotes(symbols: string[]): Promise<Record<string, AlpacaQuote>> {
    const quotes: Record<string, AlpacaQuote> = {}
    for (const symbol of symbols) {
      try {
        quotes[symbol] = await this.getLatestQuote(symbol)
      } catch (error) {
        console.warn(`[v0] Alpaca: Failed to get quote for ${symbol}`, error)
      }
    }
    return quotes
  }
}

export function createAlpacaClient(apiKey?: string, apiSecret?: string, mode?: "paper" | "live"): AlpacaClient {
  return new AlpacaClient(apiKey, apiSecret, mode)
}

export function getAlpacaClient(): AlpacaClient {
  return new AlpacaClient()
}
