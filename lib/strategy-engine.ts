import { getPositionTracker } from "./position-tracker"
import { getAIAgent } from "./ai-agent"
import { getErrorHandler } from "./error-handler"
import { getBotState, lockTradingCapital } from "./bot-state"

export interface Strategy {
  id: string
  name: string
  type: "high-volatility" | "medium-volatility" | "profit-taking"
  allocation: number // Percentage of portfolio
  running: boolean
  stopLoss: number
  takeProfit: number
  maxPositionSize: number
  aiOptimization: boolean
  plToday: number
  plTotal: number
  winRate: number
  lastRun?: string
  minProfit?: number
}

export type AllocationMode = "three-way" | "two-way" | "single"

export const MAX_EQUITY_USAGE = 0.45 // Use max 45% of equity

class StrategyEngine {
  private strategies: Map<string, Strategy> = new Map()
  private allocationMode: AllocationMode = "three-way"
  private readonly logger = getErrorHandler()
  private intervalId: NodeJS.Timeout | null = null
  private savedPositionStates: Map<string, any> = new Map()

  constructor() {
    this.initializeDefaultStrategies()
    this.restoreSavedState()
  }

  private initializeDefaultStrategies(): void {
    const defaultStrategies: Strategy[] = [
      {
        id: "high-vol-1",
        name: "High Volatility Strategy 1",
        type: "high-volatility",
        allocation: 25,
        running: false,
        stopLoss: 2.0,
        takeProfit: 5.0,
        maxPositionSize: 1000,
        aiOptimization: true,
        plToday: 0,
        plTotal: 0,
        winRate: 0,
      },
      {
        id: "high-vol-2",
        name: "High Volatility Strategy 2",
        type: "high-volatility",
        allocation: 25,
        running: false,
        stopLoss: 2.5,
        takeProfit: 6.0,
        maxPositionSize: 800,
        aiOptimization: true,
        plToday: 0,
        plTotal: 0,
        winRate: 0,
      },
      {
        id: "medium-vol-1",
        name: "Medium Volatility Strategy",
        type: "medium-volatility",
        allocation: 50,
        running: false,
        stopLoss: 1.0,
        takeProfit: 3.0,
        maxPositionSize: 1500,
        aiOptimization: true,
        plToday: 0,
        plTotal: 0,
        winRate: 0,
      },
      {
        id: "profit-taking-5",
        name: "$5 Profit Taking Strategy",
        type: "profit-taking",
        allocation: 0,
        running: false,
        stopLoss: 0.5,
        takeProfit: 5.0,
        maxPositionSize: 500,
        aiOptimization: false,
        plToday: 0,
        plTotal: 0,
        winRate: 0,
        minProfit: 5.0,
      },
    ]

    defaultStrategies.forEach((s) => this.strategies.set(s.id, s))
    this.logger.log("info", "StrategyEngine", "Initialized default strategies", null, {
      count: defaultStrategies.length,
      mode: this.allocationMode,
    })
  }

  setAllocationMode(mode: AllocationMode): void {
    this.logger.log("info", "StrategyEngine", `Changing allocation mode to ${mode}`)
    this.allocationMode = mode

    const strategies = Array.from(this.strategies.values())

    switch (mode) {
      case "three-way": // 50/25/25
        if (strategies.length >= 3) {
          strategies[0].allocation = 25 // High vol 1
          strategies[1].allocation = 25 // High vol 2
          strategies[2].allocation = 50 // Medium vol
        }
        break

      case "two-way": // 60/40 or 50/50
        if (strategies.length >= 2) {
          strategies[0].allocation = 60
          strategies[1].allocation = 40
          if (strategies.length >= 3) {
            strategies[2].allocation = 0
          }
        }
        break

      case "single": // 100%
        if (strategies.length >= 1) {
          strategies[0].allocation = 100
          strategies.slice(1).forEach((s) => (s.allocation = 0))
        }
        break
    }
  }

  async startStrategy(strategyId: string): Promise<void> {
    const strategy = this.strategies.get(strategyId)
    if (!strategy) {
      this.logger.log("error", "StrategyEngine", `Strategy ${strategyId} not found`)
      return
    }

    if (strategy.running) {
      this.logger.log("warn", "StrategyEngine", `Strategy ${strategy.name} already running`)
      return
    }

    const botState = getBotState()
    botState.brokers.forEach((broker) => {
      if (!broker.lockedTradingCapital || broker.lockedTradingCapital === 0) {
        lockTradingCapital(broker.id)
        this.logger.log("info", "StrategyEngine", `Locked trading capital for ${broker.name}`, null, {
          lockedAmount: broker.lockedTradingCapital,
        })
      }
    })

    strategy.running = true
    this.logger.log("info", "StrategyEngine", `Started strategy ${strategy.name}`)

    this.scheduleStrategyExecution(strategy)
  }

  async stopStrategy(strategyId: string): Promise<void> {
    const strategy = this.strategies.get(strategyId)
    if (!strategy) {
      this.logger.log("error", "StrategyEngine", `Strategy ${strategyId} not found`)
      return
    }

    strategy.running = false
    this.logger.log("info", "StrategyEngine", `Stopped strategy ${strategy.name}`)
  }

  private async scheduleStrategyExecution(strategy: Strategy): Promise<void> {
    const execute = async () => {
      if (!strategy.running) return

      try {
        await this.executeStrategy(strategy)
        strategy.lastRun = new Date().toISOString()
      } catch (error) {
        this.logger.log("error", "StrategyEngine", `Execution error for ${strategy.name}`, error)
      }

      if (strategy.running) {
        setTimeout(execute, 30000) // 30 seconds
      }
    }

    execute()
  }

  private async executeStrategy(strategy: Strategy): Promise<void> {
    const botState = getBotState()
    const broker = botState.brokers[0]

    if (!broker || !broker.connected) {
      console.log("[v0] StrategyEngine: No connected broker - skipping strategy execution", {
        strategyId: strategy.id,
        strategyName: strategy.name,
      })
      return
    }

    if (!broker.apiKey || broker.apiKey === "your-api-key") {
      console.log("[v0] StrategyEngine: Broker not configured with real API credentials - skipping", {
        brokerId: broker.id,
      })
      return
    }

    if (!broker.lockedTradingCapital || broker.lockedTradingCapital === 0) {
      console.warn("[v0] StrategyEngine: ⚠️ Locked capital not set - blocking strategy execution", {
        brokerId: broker.id,
        strategyId: strategy.id,
        message: "Please set locked trading capital before starting strategies",
      })
      return
    }

    const capitalPercentage = (broker.lockedTradingCapital / broker.equity) * 100
    if (capitalPercentage > 45) {
      console.warn("[v0] StrategyEngine: ⚠️ Locked capital exceeds recommended 45% - warning issued", {
        lockedCapital: broker.lockedTradingCapital,
        equity: broker.equity,
        percentage: capitalPercentage.toFixed(1),
        message: "Using more than 45% of equity increases risk",
      })
    }

    const { createAlpacaClient } = await import("./alpaca-client")
    const alpacaClient = createAlpacaClient(broker.apiKey, broker.apiSecret, broker.mode)

    const isOpen = await alpacaClient.isMarketOpen()
    if (!isOpen) {
      console.log("[v0] StrategyEngine: Market is closed - skipping strategy execution", {
        strategyId: strategy.id,
        strategyName: strategy.name,
        message: "Strategies only execute during market hours (9:30 AM - 4:00 PM ET)",
      })
      return
    }

    console.log("[v0] StrategyEngine: ✅ Market open - executing strategy with LIVE data", {
      strategyId: strategy.id,
      brokerMode: broker.mode,
      lockedCapital: broker.lockedTradingCapital,
      capitalUsage: capitalPercentage.toFixed(1) + "%",
    })

    const aiAgent = getAIAgent()
    const positionTracker = getPositionTracker()

    const watchlist = ["AAPL", "GOOGL", "MSFT", "TSLA", "NVDA"]

    if (strategy.type === "profit-taking") {
      await this.executeProfitTakingStrategy(strategy)
      return
    }

    const realtimeQuotes = await alpacaClient.getRealtimeQuotes(watchlist)
    console.log("[v0] StrategyEngine: Fetched live market quotes", {
      symbols: Object.keys(realtimeQuotes),
      mode: broker.mode,
    })

    for (const symbol of watchlist) {
      try {
        if (positionTracker.hasPosition(symbol, strategy.id)) {
          continue
        }

        const lockedCapital = broker.lockedTradingCapital
        const strategyAllocation = (strategy.allocation / 100) * lockedCapital

        const quote = realtimeQuotes[symbol]
        const currentPrice = quote ? (quote.ap + quote.bp) / 2 : 0

        if (!currentPrice) {
          console.warn(`[v0] StrategyEngine: No price data for ${symbol}, skipping`)
          continue
        }

        console.log(`[v0] StrategyEngine: Analyzing ${symbol} with LIVE price: $${currentPrice.toFixed(2)}`, {
          bidPrice: quote.bp,
          askPrice: quote.ap,
          mode: broker.mode,
        })

        const decision = await aiAgent.analyzeAndDecide({
          strategyId: strategy.id,
          strategyName: strategy.name,
          strategyType: strategy.type,
          symbol,
          currentPrice,
          accountBalance: strategyAllocation,
          allocation: strategy.allocation,
        })

        if (decision.action === "buy" && decision.quantity > 0) {
          // CRITICAL FIX: ACTUALLY EXECUTE THE TRADE
          try {
            console.log("[v0] StrategyEngine: 🔴 EXECUTING REAL BUY ORDER", {
              symbol,
              qty: decision.quantity,
              price: currentPrice,
              mode: broker.mode,
              strategy: strategy.name,
            })

            const orderResult = await alpacaClient.createOrder({
              symbol,
              qty: decision.quantity.toString(),
              side: "buy",
              type: "market",
              time_in_force: "day",
            })

            console.log("[v0] StrategyEngine: ✅ BUY ORDER EXECUTED", {
              orderId: orderResult.id,
              status: orderResult.status,
              symbol,
              qty: decision.quantity,
            })

            // NOW record the position after successful order
            positionTracker.recordPosition({
              positionId: `${strategy.id}-${symbol}-${Date.now()}`,
              symbol,
              qty: decision.quantity,
              entryPrice: currentPrice,
              currentPrice,
              strategyId: strategy.id,
              strategyName: strategy.name,
              openReason: decision.reasoning,
              openTimestamp: new Date().toISOString(),
              signals: decision.signals,
              stopLoss: strategy.stopLoss,
              takeProfit: strategy.takeProfit,
              unrealizedPL: 0,
            })

            this.logger.log("info", "StrategyEngine", `Opened position: ${symbol}`, null, {
              strategy: strategy.name,
              qty: decision.quantity,
              price: currentPrice,
              reasoning: decision.reasoning,
              orderId: orderResult.id,
            })
          } catch (error) {
            this.logger.log("error", "StrategyEngine", `❌ Failed to execute BUY order for ${symbol}`, error)
            console.error("[v0] StrategyEngine: BUY order failed", {
              symbol,
              qty: decision.quantity,
              error: error instanceof Error ? error.message : String(error),
            })
          }
        }
      } catch (error) {
        this.logger.log("error", "StrategyEngine", `Failed to process ${symbol}`, error)
      }
    }

    // Check existing positions for sell signals
    const positions = positionTracker.getPositionsByStrategy(strategy.id)
    for (const position of positions) {
      try {
        const quote = realtimeQuotes[position.symbol]
        const currentPrice = quote ? (quote.ap + quote.bp) / 2 : position.currentPrice

        position.currentPrice = currentPrice
        position.unrealizedPL = (currentPrice - position.entryPrice) * position.qty

        console.log(`[v0] StrategyEngine: Updated ${position.symbol} position`, {
          entryPrice: position.entryPrice,
          currentPrice,
          pl: position.unrealizedPL.toFixed(2),
          plPercent: (((currentPrice - position.entryPrice) / position.entryPrice) * 100).toFixed(2) + "%",
        })

        const lockedCapital = broker.lockedTradingCapital
        const strategyAllocation = (strategy.allocation / 100) * lockedCapital

        const decision = await aiAgent.analyzeAndDecide({
          strategyId: strategy.id,
          strategyName: strategy.name,
          strategyType: strategy.type,
          symbol: position.symbol,
          currentPrice,
          accountBalance: strategyAllocation,
          allocation: strategy.allocation,
        })

        if (decision.action === "sell") {
          // CRITICAL FIX: ACTUALLY EXECUTE THE SELL ORDER
          try {
            console.log("[v0] StrategyEngine: 🔴 EXECUTING REAL SELL ORDER", {
              symbol: position.symbol,
              qty: position.qty,
              price: currentPrice,
              pl: position.unrealizedPL.toFixed(2),
              mode: broker.mode,
            })

            const orderResult = await alpacaClient.createOrder({
              symbol: position.symbol,
              qty: position.qty.toString(),
              side: "sell",
              type: "market",
              time_in_force: "day",
            })

            console.log("[v0] StrategyEngine: ✅ SELL ORDER EXECUTED", {
              orderId: orderResult.id,
              status: orderResult.status,
              symbol: position.symbol,
              qty: position.qty,
              pl: position.unrealizedPL.toFixed(2),
            })

            positionTracker.closePosition(position.positionId, decision.reasoning, position.unrealizedPL)

            this.logger.log("info", "StrategyEngine", `Closed position: ${position.symbol}`, null, {
              strategy: strategy.name,
              reasoning: decision.reasoning,
              pl: position.unrealizedPL,
              orderId: orderResult.id,
            })
          } catch (error) {
            this.logger.log("error", "StrategyEngine", `❌ Failed to execute SELL order for ${position.symbol}`, error)
            console.error("[v0] StrategyEngine: SELL order failed", {
              symbol: position.symbol,
              qty: position.qty,
              error: error instanceof Error ? error.message : String(error),
            })
          }
        }
      } catch (error) {
        this.logger.log("error", "StrategyEngine", `Failed to check position ${position.symbol}`, error)
      }
    }
  }

  private async executeProfitTakingStrategy(strategy: Strategy): Promise<void> {
    const positionTracker = getPositionTracker()
    const positions = positionTracker.getPositionsByStrategy(strategy.id)
    const minProfit = strategy.minProfit || 5.0
    const botState = getBotState()

    this.logger.log("info", "StrategyEngine", `Running profit-taking strategy: min profit $${minProfit}`)

    const broker = botState.brokers[0]
    if (!broker?.apiKey || broker.apiKey === "your-api-key") {
      return
    }

    const { createAlpacaClient } = await import("./alpaca-client")
    const alpacaClient = createAlpacaClient(broker.apiKey, broker.apiSecret, broker.mode)

    const symbols = positions.map((p) => p.symbol)
    const realtimeQuotes = await alpacaClient.getRealtimeQuotes(symbols)

    // Check existing positions for profit target
    for (const position of positions) {
      try {
        const quote = realtimeQuotes[position.symbol]
        const currentPrice = quote ? (quote.ap + quote.bp) / 2 : position.currentPrice

        position.currentPrice = currentPrice
        const profit = (currentPrice - position.entryPrice) * position.qty

        if (profit >= minProfit) {
          // EXECUTE REAL SELL ORDER
          try {
            console.log("[v0] StrategyEngine: 🔴 PROFIT TARGET REACHED - EXECUTING SELL", {
              symbol: position.symbol,
              qty: position.qty,
              profit: profit.toFixed(2),
              target: minProfit,
            })

            const orderResult = await alpacaClient.createOrder({
              symbol: position.symbol,
              qty: position.qty.toString(),
              side: "sell",
              type: "market",
              time_in_force: "day",
            })

            console.log("[v0] StrategyEngine: ✅ PROFIT-TAKING SELL EXECUTED", {
              orderId: orderResult.id,
              status: orderResult.status,
              symbol: position.symbol,
              profit: profit.toFixed(2),
            })

            positionTracker.closePosition(
              position.positionId,
              `Profit target reached: $${profit.toFixed(2)} >= $${minProfit}`,
              profit,
            )

            strategy.plToday += profit
            strategy.plTotal += profit

            this.logger.log("info", "StrategyEngine", `Profit taking: sold ${position.symbol}`, null, {
              profit: profit.toFixed(2),
              target: minProfit,
              totalProfit: strategy.plTotal.toFixed(2),
              orderId: orderResult.id,
            })
          } catch (error) {
            this.logger.log("error", "StrategyEngine", `Failed to execute profit-taking sell for ${position.symbol}`, error)
          }
        }
      } catch (error) {
        this.logger.log("error", "StrategyEngine", `Failed to check profit for ${position.symbol}`, error)
      }
    }

    // Look for new entries
    const watchlist = ["AAPL", "GOOGL", "MSFT", "TSLA", "NVDA", "SPY", "QQQ"]
    const aiAgent = getAIAgent()
    const quotes = await alpacaClient.getRealtimeQuotes(watchlist)

    for (const symbol of watchlist) {
      try {
        if (positionTracker.hasPosition(symbol, strategy.id)) continue

        const quote = quotes[symbol]
        if (!quote) continue

        const currentPrice = (quote.ap + quote.bp) / 2
        const lockedCapital = botState.brokers[0].lockedTradingCapital
        const strategyAllocation = (strategy.allocation / 100) * lockedCapital

        const decision = await aiAgent.analyzeAndDecide({
          strategyId: strategy.id,
          strategyName: strategy.name,
          strategyType: strategy.type,
          symbol,
          currentPrice,
          accountBalance: strategyAllocation,
          allocation: strategy.allocation,
        })

        if (decision.action === "buy" && decision.quantity > 0 && decision.confidence > 70) {
          // EXECUTE REAL BUY ORDER
          try {
            console.log("[v0] StrategyEngine: 🔴 PROFIT-TAKING ENTRY - EXECUTING BUY", {
              symbol,
              qty: decision.quantity,
              price: currentPrice,
              confidence: decision.confidence,
            })

            const orderResult = await alpacaClient.createOrder({
              symbol,
              qty: decision.quantity.toString(),
              side: "buy",
              type: "market",
              time_in_force: "day",
            })

            console.log("[v0] StrategyEngine: ✅ PROFIT-TAKING BUY EXECUTED", {
              orderId: orderResult.id,
              status: orderResult.status,
              symbol,
              qty: decision.quantity,
            })

            positionTracker.recordPosition({
              positionId: `${strategy.id}-${symbol}-${Date.now()}`,
              symbol,
              qty: decision.quantity,
              entryPrice: currentPrice,
              currentPrice,
              strategyId: strategy.id,
              strategyName: strategy.name,
              openReason: `Profit-taking entry: ${decision.reasoning}`,
              openTimestamp: new Date().toISOString(),
              signals: decision.signals,
              stopLoss: strategy.stopLoss,
              takeProfit: strategy.takeProfit,
              unrealizedPL: 0,
            })

            this.logger.log("info", "StrategyEngine", `Opened profit-taking position: ${symbol}`, null, {
              qty: decision.quantity,
              price: currentPrice,
              confidence: decision.confidence,
              orderId: orderResult.id,
            })
          } catch (error) {
            this.logger.log("error", "StrategyEngine", `Failed to execute profit-taking buy for ${symbol}`, error)
          }
        }
      } catch (error) {
        this.logger.log("error", "StrategyEngine", `Failed to evaluate ${symbol}`, error)
      }
    }
  }

  getStrategies(): Strategy[] {
    return Array.from(this.strategies.values())
  }

  getStrategy(id: string): Strategy | undefined {
    return this.strategies.get(id)
  }

  updateStrategyAllocation(id: string, allocation: number): void {
    const strategy = this.strategies.get(id)
    if (strategy) {
      strategy.allocation = allocation
      this.logger.log("info", "StrategyEngine", `Updated allocation for ${strategy.name}`, null, {
        newAllocation: allocation,
      })
    }
  }

  async gracefulShutdown(): Promise<void> {
    console.log("[v0] StrategyEngine: Starting graceful shutdown...")
    this.logger.log("info", "StrategyEngine", "Initiating graceful shutdown")
    const positionTracker = getPositionTracker()

    this.savedPositionStates.clear()

    const runningStrategies = Array.from(this.strategies.values()).filter((s) => s.running)
    console.log(`[v0] StrategyEngine: Found ${runningStrategies.length} running strategies to stop`)

    for (const strategy of runningStrategies) {
      strategy.running = false
      console.log(`[v0] StrategyEngine: Stopped strategy "${strategy.name}"`)
      this.logger.log("info", "StrategyEngine", `Stopped strategy ${strategy.name}`)
    }

    console.log("[v0] StrategyEngine: Processing positions for graceful shutdown...")

    for (const strategy of runningStrategies) {
      const positions = positionTracker.getPositionsByStrategy(strategy.id)
      console.log(`[v0] StrategyEngine: Strategy "${strategy.name}" has ${positions.length} positions`)

      if (strategy.type === "high-volatility") {
        this.logger.log("info", "StrategyEngine", `Closing high volatility positions for ${strategy.name}`)

        for (const position of positions) {
          try {
            const closeReason = `Graceful shutdown - closing high volatility position`
            positionTracker.closePosition(position.positionId, closeReason)
            console.log(
              `[v0] StrategyEngine: Closed high vol position ${position.symbol} with P/L: $${position.unrealizedPL}`,
            )

            this.logger.log("info", "StrategyEngine", `Closed position ${position.symbol}`, null, {
              strategy: strategy.name,
              unrealizedPL: position.unrealizedPL,
            })
          } catch (error) {
            console.error(`[v0] StrategyEngine: Failed to close position ${position.symbol}:`, error)
            this.logger.log("error", "StrategyEngine", `Failed to close position ${position.symbol}`, error)
          }
        }
      } else {
        this.logger.log("info", "StrategyEngine", `Saving positions for ${strategy.name}`)
        positions.forEach((pos) => {
          this.savedPositionStates.set(pos.positionId, {
            ...pos,
            savedAt: new Date().toISOString(),
          })
          console.log(`[v0] StrategyEngine: Saved position ${pos.symbol} for later resume`)
        })
      }
    }

    const summary = {
      stoppedStrategies: runningStrategies.length,
      savedPositions: this.savedPositionStates.size,
    }

    console.log("[v0] StrategyEngine: Graceful shutdown completed", summary)
    this.logger.log("info", "StrategyEngine", "Graceful shutdown complete", null, summary)
  }

  private async restoreSavedState(): Promise<void> {
    if (this.savedPositionStates.size === 0) {
      this.logger.log("info", "StrategyEngine", "No saved state to restore")
      return
    }

    this.logger.log("info", "StrategyEngine", "Evaluating saved positions for resume", null, {
      count: this.savedPositionStates.size,
    })

    const aiAgent = getAIAgent()
    const positionTracker = getPositionTracker()

    for (const [positionId, savedPosition] of this.savedPositionStates.entries()) {
      try {
        const strategy = this.strategies.get(savedPosition.strategyId)
        if (!strategy) continue

        const decision = await aiAgent.analyzeAndDecide({
          strategyId: strategy.id,
          strategyName: strategy.name,
          strategyType: strategy.type,
          symbol: savedPosition.symbol,
          currentPrice: savedPosition.currentPrice,
          accountBalance: 10000, // Replace with actual
          allocation: strategy.allocation,
        })

        if (decision.action === "buy" && decision.confidence > 60) {
          positionTracker.recordPosition({
            ...savedPosition,
            positionId: `${strategy.id}-${savedPosition.symbol}-${Date.now()}`,
            openReason: `Resumed after shutdown: ${decision.reasoning}`,
            openTimestamp: new Date().toISOString(),
          })

          this.logger.log("info", "StrategyEngine", `Resumed position ${savedPosition.symbol}`, null, {
            strategy: strategy.name,
            confidence: decision.confidence,
          })
        } else {
          this.logger.log("info", "StrategyEngine", `Not resuming ${savedPosition.symbol}`, null, {
            reason: decision.reasoning,
            confidence: decision.confidence,
          })
        }
      } catch (error) {
        this.logger.log("error", "StrategyEngine", `Failed to evaluate saved position ${positionId}`, error)
      }
    }

    this.savedPositionStates.clear()
  }
}

let strategyEngineInstance: StrategyEngine | null = null

export function getStrategyEngine(): StrategyEngine {
  if (!strategyEngineInstance) {
    strategyEngineInstance = new StrategyEngine()
  }
  return strategyEngineInstance
}
