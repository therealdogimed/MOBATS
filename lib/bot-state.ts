interface Broker {
  id: string
  name: string
  type: string
  connected: boolean
  equity: number
  buyingPower: number
  positions: number
  openPositions: number
  todayPL: number
  pl: number
  positionsList: Array<{
    symbol: string
    qty: number
    entryPrice: number
    currentPrice: number
    pl: number
    plPercent: number
  }>
  lockedTradingCapital: number
  reserveCapital: number
  apiKey?: string
  apiSecret?: string
  mode?: "paper" | "live"
}

interface Strategy {
  id: string
  name: string
  type: string
  running: boolean
  allocation: number
  plToday: number
  plTotal: number
  winRate: number
  stopLoss: number
  takeProfit: number
  maxPositionSize: number
  aiOptimization: boolean
}

interface BotState {
  brokers: Broker[]
  strategies: Strategy[]
  plHistory: Array<{ timestamp: number; value: number }>
  transactions: Array<{ timestamp: number; type: string; symbol: string; qty: number; price: number }>
  settings: {
    newsApiKey?: string
    signalsApiKey?: string
    researchApiKey?: string
    aiModel?: string
    aiPrompt?: string
    aiRiskManagement?: boolean
    maxDrawdown?: number
    maxDailyLoss?: number
    defaultStopLoss?: number
    defaultTakeProfit?: number
  }
}

import { saveState, loadState } from "./persistence"

function initializeState(): BotState {
  if (typeof window === "undefined") {
    // Server-side: return default state
    return {
      brokers: [
        {
          id: "alpaca-1",
          name: "Alpaca Paper Trading",
          type: "Alpaca",
          connected: true,
          equity: 100000,
          buyingPower: 100000,
          positions: 0,
          openPositions: 0,
          todayPL: 0,
          pl: 0,
          positionsList: [],
          lockedTradingCapital: 45000,
          reserveCapital: 55000,
          apiKey: "your-api-key",
          apiSecret: "your-api-secret",
          mode: "paper",
        },
      ],
      strategies: [
        {
          id: "dividend-1",
          name: "Dividend Growth Strategy",
          type: "Long-term Dividend",
          running: false,
          allocation: 60,
          plToday: 0,
          plTotal: 0,
          winRate: 0,
          stopLoss: 5,
          takeProfit: 20,
          maxPositionSize: 10000,
          aiOptimization: true,
        },
        {
          id: "scalping-1",
          name: "High-Volatility Scalper",
          type: "Day Trading Scalper",
          running: false,
          allocation: 40,
          plToday: 0,
          plTotal: 0,
          winRate: 0,
          stopLoss: 1,
          takeProfit: 2,
          maxPositionSize: 5000,
          aiOptimization: true,
        },
      ],
      plHistory: [],
      transactions: [],
      settings: {
        aiModel: "openai/gpt-4o",
        aiRiskManagement: true,
        maxDrawdown: 10,
        maxDailyLoss: 1000,
        defaultStopLoss: 1,
        defaultTakeProfit: 2,
      },
    }
  }

  // Client-side: load from localStorage
  const persisted = loadState()

  // Merge persisted data with defaults
  const defaultState = {
    brokers: [
      {
        id: "alpaca-1",
        name: "Alpaca Paper Trading",
        type: "Alpaca",
        connected: true,
        equity: 100000,
        buyingPower: 100000,
        positions: 0,
        openPositions: 0,
        todayPL: 0,
        pl: 0,
        positionsList: [],
        lockedTradingCapital: 45000,
        reserveCapital: 55000,
        apiKey: "your-api-key",
        apiSecret: "your-api-secret",
        mode: "paper",
      },
    ],
    strategies: [
      {
        id: "dividend-1",
        name: "Dividend Growth Strategy",
        type: "Long-term Dividend",
        running: false,
        allocation: 60,
        plToday: 0,
        plTotal: 0,
        winRate: 0,
        stopLoss: 5,
        takeProfit: 20,
        maxPositionSize: 10000,
        aiOptimization: true,
      },
      {
        id: "scalping-1",
        name: "High-Volatility Scalper",
        type: "Day Trading Scalper",
        running: false,
        allocation: 40,
        plToday: 0,
        plTotal: 0,
        winRate: 0,
        stopLoss: 1,
        takeProfit: 2,
        maxPositionSize: 5000,
        aiOptimization: true,
      },
    ],
    plHistory: [],
    transactions: [],
    settings: {
      aiModel: "openai/gpt-4o",
      aiRiskManagement: true,
      maxDrawdown: 10,
      maxDailyLoss: 1000,
      defaultStopLoss: 1,
      defaultTakeProfit: 2,
    },
  }

  return {
    brokers: persisted.brokers.length > 0 ? persisted.brokers : defaultState.brokers,
    strategies: persisted.strategies.length > 0 ? persisted.strategies : defaultState.strategies,
    plHistory: [],
    transactions: [],
    settings: { ...defaultState.settings, ...persisted.settings },
  }
}

const botState: BotState = initializeState()

let isSimulating = false
const failedAuthAttempts = new Map<string, number>()
const MAX_AUTH_FAILURES = 3

export async function syncAlpacaData() {
  try {
    const alpacaBrokers = botState.brokers.filter((b) => b.type.toLowerCase() === "alpaca")

    if (alpacaBrokers.length === 0) {
      return
    }

    for (const alpacaBroker of alpacaBrokers) {
      if (
        !alpacaBroker.apiKey ||
        !alpacaBroker.apiSecret ||
        alpacaBroker.apiKey === "your-api-key" ||
        alpacaBroker.apiSecret === "your-api-secret"
      ) {
        alpacaBroker.connected = false
        continue
      }

      const failureCount = failedAuthAttempts.get(alpacaBroker.id) || 0
      if (failureCount >= MAX_AUTH_FAILURES) {
        alpacaBroker.connected = false
        continue
      }

      const { createAlpacaClient } = await import("./alpaca-client")
      const client = createAlpacaClient(alpacaBroker.apiKey, alpacaBroker.apiSecret, alpacaBroker.mode)

      if (!client.isConfigured()) {
        alpacaBroker.connected = false
        continue
      }

      const verification = await client.verifyConnection()
      if (!verification.success) {
        if (verification.error?.includes("401") || verification.error?.includes("unauthorized")) {
          failedAuthAttempts.set(alpacaBroker.id, failureCount + 1)

          if (failureCount + 1 >= MAX_AUTH_FAILURES) {
            console.error("[v0] bot-state: Max auth failures reached, stopping sync for broker", {
              brokerId: alpacaBroker.id,
              brokerName: alpacaBroker.name,
              message: "Please configure valid API credentials in the broker settings",
            })
          }
        }

        alpacaBroker.connected = false
        continue
      }

      failedAuthAttempts.delete(alpacaBroker.id)

      const [account, positions] = await Promise.all([client.getAccount(), client.getPositions()])

      const oldEquity = alpacaBroker.equity

      alpacaBroker.equity = Number.parseFloat(account.portfolio_value)
      alpacaBroker.buyingPower = Number.parseFloat(account.buying_power)
      alpacaBroker.positions = positions.length
      alpacaBroker.openPositions = positions.length

      alpacaBroker.positionsList = positions.map((p) => ({
        symbol: p.symbol,
        qty: Number.parseFloat(p.qty),
        entryPrice: Number.parseFloat(p.market_value) / Number.parseFloat(p.qty),
        currentPrice: Number.parseFloat(p.market_value) / Number.parseFloat(p.qty),
        pl: Number.parseFloat(p.unrealized_pl),
        plPercent: Number.parseFloat(p.unrealized_plpc) * 100,
      }))

      const totalPL = alpacaBroker.positionsList.reduce((sum, p) => sum + p.pl, 0)
      alpacaBroker.pl = totalPL
      alpacaBroker.todayPL = totalPL

      if (oldEquity !== alpacaBroker.equity) {
        alpacaBroker.reserveCapital = alpacaBroker.equity - alpacaBroker.lockedTradingCapital
      }

      alpacaBroker.connected = true

      console.log("[v0] bot-state: Alpaca data synced successfully", {
        brokerId: alpacaBroker.id,
        mode: client.getMode(),
        equity: alpacaBroker.equity,
        buyingPower: alpacaBroker.buyingPower,
        positions: positions.length,
      })
    }

    if (typeof window !== "undefined") {
      saveState({ brokers: botState.brokers })
    }
  } catch (error) {
    console.error("[v0] bot-state: Failed to sync Alpaca data:", error)
  }
}

function startSimulation() {
  if (isSimulating) return

  isSimulating = true

  const hasAlpacaBrokers = () =>
    botState.brokers.some(
      (b) =>
        b.type.toLowerCase() === "alpaca" &&
        b.apiKey &&
        b.apiSecret &&
        b.apiKey !== "your-api-key" &&
        b.apiSecret !== "your-api-secret",
    )

  // Only sync Alpaca data - no fake data generation
  if (hasAlpacaBrokers()) {
    syncAlpacaData().catch((err) => {
      console.error("[v0] bot-state: Initial Alpaca sync error:", err)
    })
  }

  // Periodic sync for Alpaca brokers only - no simulation
  setInterval(() => {
    if (hasAlpacaBrokers()) {
      syncAlpacaData().catch((err) => {
        console.error("[v0] bot-state: Alpaca sync error:", err)
      })
    }
  }, 60000) // 60 seconds

  // No more fake P/L or ticker simulation - removed entirely
}

export function getBotState(): BotState {
  return botState
}

export function addBroker(data: any) {
  const newBroker: Broker = {
    id: `${data.type.toLowerCase()}-${Date.now()}`,
    name: data.name,
    type: data.type.toLowerCase(), // Normalize to lowercase
    connected: false, // Start as disconnected until verified
    equity: 0,
    buyingPower: 0,
    positions: 0,
    openPositions: 0,
    todayPL: 0,
    pl: 0,
    positionsList: [],
    lockedTradingCapital: 0,
    reserveCapital: 0,
    apiKey: data.apiKey,
    apiSecret: data.apiSecret,
    mode: data.mode || "paper",
  }

  botState.brokers.push(newBroker)

  if (typeof window !== "undefined") {
    saveState({ brokers: botState.brokers })
  }

  if (newBroker.type === "alpaca" && newBroker.apiKey && newBroker.apiSecret) {
    console.log("[v0] bot-state: New Alpaca broker added, triggering sync...")
    syncAlpacaData().catch((err) => {
      console.error("[v0] bot-state: New broker sync error:", err)
    })
  }

  return newBroker
}

export function removeBroker(id: string) {
  botState.brokers = botState.brokers.filter((b) => b.id !== id)

  if (typeof window !== "undefined") {
    saveState({ brokers: botState.brokers })
  }
}

export function toggleStrategy(id: string, action: "start" | "stop") {
  const strategy = botState.strategies.find((s) => s.id === id)
  if (strategy) {
    strategy.running = action === "start"

    if (typeof window !== "undefined") {
      saveState({ strategies: botState.strategies })
    }
  }
}

export function toggleAllStrategies(action: "start" | "stop") {
  botState.strategies.forEach((strategy) => {
    strategy.running = action === "start"
  })

  if (typeof window !== "undefined") {
    saveState({ strategies: botState.strategies })
  }
}

export function updateStrategyAllocation(id: string, allocation: number) {
  const strategy = botState.strategies.find((s) => s.id === id)
  if (strategy) {
    strategy.allocation = allocation

    if (typeof window !== "undefined") {
      saveState({ strategies: botState.strategies })
    }
  }
}

export function updateSettings(settings: any) {
  botState.settings = { ...botState.settings, ...settings }

  if (typeof window !== "undefined") {
    saveState({ settings: botState.settings })
  }
}

export function updateBrokerTradingCapital(brokerId: string, amount: number) {
  const broker = botState.brokers.find((b) => b.id === brokerId)
  if (broker) {
    console.log("[v0] bot-state: Before update", {
      brokerId,
      oldLockedCapital: broker.lockedTradingCapital,
      oldReserveCapital: broker.reserveCapital,
      equity: broker.equity,
      buyingPower: broker.buyingPower,
      requestedAmount: amount,
    })

    broker.lockedTradingCapital = amount
    broker.reserveCapital = broker.equity - amount

    console.log("[v0] bot-state: After update", {
      brokerId,
      newLockedCapital: broker.lockedTradingCapital,
      newReserveCapital: broker.reserveCapital,
      equity: broker.equity,
      buyingPower: broker.buyingPower,
    })

    if (typeof window !== "undefined") {
      saveState({ brokers: botState.brokers })
    }
  } else {
    console.error("[v0] bot-state: Broker not found for capital update", { brokerId })
  }
}

export function lockTradingCapital(brokerId: string) {
  const broker = botState.brokers.find((b) => b.id === brokerId)
  if (broker) {
    const baseCapital = Math.max(broker.equity, broker.buyingPower * 0.5)
    broker.lockedTradingCapital = baseCapital * 0.45
    broker.reserveCapital = broker.equity - broker.lockedTradingCapital
    console.log("[v0] bot-state: Auto-locked trading capital", {
      brokerId,
      baseCapital,
      lockedCapital: broker.lockedTradingCapital,
      reserveCapital: broker.reserveCapital,
    })
  }
}

export function getBrokerCredentials(brokerId: string): { apiKey?: string; apiSecret?: string; mode?: string } | null {
  const broker = botState.brokers.find((b) => b.id === brokerId)
  if (!broker) return null

  return {
    apiKey: broker.apiKey,
    apiSecret: broker.apiSecret,
    mode: broker.mode,
  }
}

export function getAlpacaBroker(): Broker | null {
  return botState.brokers.find((b) => b.type.toLowerCase() === "alpaca") || null
}

export function updateBrokerCredentials(brokerId: string, apiKey: string, apiSecret: string) {
  const broker = botState.brokers.find((b) => b.id === brokerId)
  if (broker) {
    broker.apiKey = apiKey
    broker.apiSecret = apiSecret

    failedAuthAttempts.delete(brokerId)

    console.log("[v0] bot-state: Broker credentials updated", {
      brokerId,
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret,
    })

    if (typeof window !== "undefined") {
      saveState({ brokers: botState.brokers })
    }

    if (broker.type === "alpaca" && apiKey && apiSecret) {
      console.log("[v0] bot-state: Alpaca credentials updated, triggering sync...")
      syncAlpacaData().catch((err) => {
        console.error("[v0] bot-state: Credentials update sync error:", err)
      })
    }
  }
}
