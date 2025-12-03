import { createAlpacaClient } from "./alpaca-client"
import { getAlpacaBroker } from "./bot-state"

interface Position {
  symbol: string
  qty: string
  market_value: string
  unrealized_pl: string
  unrealized_plpc: string
}

interface BotStatus {
  isRunning: boolean
  positions: Position[]
  accountValue: string
  buyingPower: string
  lastUpdate: string
  error?: string
}

interface TradingStrategy {
  shouldBuy: (symbol: string, price: number) => Promise<boolean>
  shouldSell: (symbol: string, price: number) => Promise<boolean>
}

class BotEngine {
  private client: any
  private isRunning = false
  private intervalId: NodeJS.Timeout | null = null
  private currentStatus: BotStatus
  private strategy: TradingStrategy

  constructor() {
    this.client = null
    this.currentStatus = {
      isRunning: false,
      positions: [],
      accountValue: "0",
      buyingPower: "0",
      lastUpdate: new Date().toISOString(),
    }

    // Simple moving average crossover strategy
    this.strategy = {
      shouldBuy: async (symbol: string, price: number) => {
        // Placeholder - implement your strategy logic
        return false
      },
      shouldSell: async (symbol: string, price: number) => {
        // Placeholder - implement your strategy logic
        return false
      },
    }
  }

  private getClient() {
    const broker = getAlpacaBroker()
    if (!broker || !broker.apiKey || !broker.apiSecret) {
      return null
    }

    this.client = createAlpacaClient(broker.apiKey, broker.apiSecret, broker.mode)
    return this.client
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("[v0] Bot is already running")
      return
    }

    console.log("[v0] Starting bot engine...")
    this.isRunning = true

    // Update status immediately
    await this.updateStatus()

    // Start trading loop
    this.intervalId = setInterval(() => {
      this.tradingLoop().catch((error) => {
        console.error("[v0] Trading loop error:", error)
        this.currentStatus.error = error instanceof Error ? error.message : "Unknown error"
      })
    }, 30000) // Run every 30 seconds

    console.log("[v0] Bot engine started")
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log("[v0] Bot is already stopped")
      return
    }

    console.log("[v0] Stopping bot engine...")
    this.isRunning = false

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    await this.updateStatus()
    console.log("[v0] Bot engine stopped")
  }

  async getStatus(): Promise<BotStatus> {
    // Always fetch fresh data
    await this.updateStatus()
    return this.currentStatus
  }

  private async updateStatus(): Promise<void> {
    try {
      console.log("[v0] BotEngine: Updating bot status...")

      const client = this.getClient()
      if (!client || !client.isConfigured()) {
        this.currentStatus = {
          isRunning: this.isRunning,
          positions: [],
          accountValue: "0",
          buyingPower: "0",
          lastUpdate: new Date().toISOString(),
          error: "Alpaca credentials not configured",
        }
        return
      }

      const [account, positions] = await Promise.all([client.getAccount(), client.getPositions()])

      console.log("[v0] BotEngine: Received account data", {
        portfolioValue: account.portfolio_value,
        buyingPower: account.buying_power,
        positionCount: positions.length,
      })

      this.currentStatus = {
        isRunning: this.isRunning,
        positions: positions.map((p: any) => ({
          symbol: p.symbol,
          qty: p.qty,
          market_value: p.market_value,
          unrealized_pl: p.unrealized_pl,
          unrealized_plpc: p.unrealized_plpc,
        })),
        accountValue: account.portfolio_value,
        buyingPower: account.buying_power,
        lastUpdate: new Date().toISOString(),
        error: undefined,
      }

      console.log("[v0] BotEngine: Status updated successfully", {
        isRunning: this.currentStatus.isRunning,
        positionCount: this.currentStatus.positions.length,
        accountValue: this.currentStatus.accountValue,
        buyingPower: this.currentStatus.buyingPower,
      })
    } catch (error) {
      console.error("[v0] BotEngine: Failed to update status:", error)
      this.currentStatus.error = error instanceof Error ? error.message : "Failed to fetch data"
    }
  }

  private async tradingLoop(): Promise<void> {
    if (!this.isRunning) return

    const client = this.getClient()
    if (!client || !client.isConfigured()) {
      return
    }

    console.log("[v0] BotEngine: Running trading loop...")

    try {
      // Update status
      await this.updateStatus()

      // Get current positions
      const positions = await client.getPositions()

      const clock = await client.getClock()
      if (!clock.is_open) {
        console.log("[v0] BotEngine: ⚠️ Market is CLOSED - Skipping trading", {
          currentTime: new Date().toISOString(),
          nextOpen: clock.next_open,
        })
        return
      }

      console.log("[v0] BotEngine: ✅ Market is OPEN - Ready to trade", {
        timestamp: clock.timestamp,
        nextClose: clock.next_close,
      })

      // Example: Check positions for sell signals
      for (const position of positions) {
        const quote = await client.getQuote(position.symbol)
        const currentPrice = Number.parseFloat(quote.ap) // Ask price

        if (await this.strategy.shouldSell(position.symbol, currentPrice)) {
          console.log(`[v0] BotEngine: Sell signal for ${position.symbol}`)

          console.log("[v0] BotEngine: Placing LIVE SELL order", {
            symbol: position.symbol,
            qty: position.qty,
            currentPrice,
            orderType: "market",
          })

          const orderResult = await client.createOrder({
            symbol: position.symbol,
            qty: position.qty,
            side: "sell",
            type: "market",
            time_in_force: "day",
          })

          console.log("[v0] BotEngine: LIVE SELL order submitted", {
            orderId: orderResult.id,
            status: orderResult.status,
            symbol: position.symbol,
          })
        }
      }

      // Example: Check watchlist for buy signals
      const watchlist = ["AAPL", "GOOGL", "MSFT", "TSLA"]
      for (const symbol of watchlist) {
        const quote = await client.getQuote(symbol)
        const currentPrice = Number.parseFloat(quote.bp) // Bid price

        if (await this.strategy.shouldBuy(symbol, currentPrice)) {
          console.log(`[v0] BotEngine: Buy signal for ${symbol}`)
          const account = await client.getAccount()

          const buyingPower = Number.parseFloat(account.buying_power)
          console.log("[v0] BotEngine: Using buying power from API", {
            buyingPower,
            portfolioValue: account.portfolio_value,
          })

          // Use 5% of buying power per trade
          const tradeAmount = buyingPower * 0.05
          const qty = Math.floor(tradeAmount / currentPrice)

          console.log("[v0] BotEngine: Calculated trade size", {
            symbol,
            buyingPower,
            tradeAmount,
            currentPrice,
            qty,
          })

          if (qty > 0) {
            console.log("[v0] BotEngine: Placing LIVE BUY order", {
              symbol,
              qty,
              currentPrice,
              tradeAmount: tradeAmount.toFixed(2),
              orderType: "market",
            })

            const orderResult = await client.createOrder({
              symbol,
              qty: qty.toString(),
              side: "buy",
              type: "market",
              time_in_force: "day",
            })

            console.log("[v0] BotEngine: LIVE BUY order submitted", {
              orderId: orderResult.id,
              status: orderResult.status,
              symbol,
              qty,
            })
          } else {
            console.log("[v0] BotEngine: Insufficient buying power for trade", { symbol, buyingPower, currentPrice })
          }
        }
      }
    } catch (error) {
      console.error("[v0] BotEngine: Trading loop error:", error)
      throw error
    }
  }
}

// Singleton instance
let botEngineInstance: BotEngine | null = null

export function getBotEngine(): BotEngine {
  if (!botEngineInstance) {
    botEngineInstance = new BotEngine()
  }
  return botEngineInstance
}
