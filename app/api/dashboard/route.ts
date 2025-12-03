import { NextResponse } from "next/server"
import { getBotState } from "@/lib/bot-state"
import { getPositionTracker } from "@/lib/position-tracker"

export async function GET() {
  try {
    const state = getBotState()
    const positionTracker = getPositionTracker()
    const scalpingProfit = positionTracker.getScalpingProfit()
    const scalpingTradeCount = positionTracker.getScalpingTradeCount()

    const totalEquity = state.brokers.reduce((sum, b) => sum + b.equity, 0)
    const totalPL = state.brokers.reduce((sum, b) => sum + b.pl, 0)
    const totalPLPercent = totalEquity > 0 ? (totalPL / totalEquity) * 100 : 0
    const activePositions = state.brokers.reduce((sum, b) => sum + b.positions, 0)
    const activeStrategies = state.strategies.filter((s) => s.running).length

    const lockedCapital = state.brokers.reduce((sum, b) => sum + b.lockedTradingCapital, 0)
    const reserveCapital = state.brokers.reduce((sum, b) => sum + b.reserveCapital, 0)

    const plHistory = state.plHistory.slice(-50).map((entry) => ({
      time: new Date(entry.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      value: entry.value,
    }))

    const positions = state.brokers.flatMap((broker) =>
      broker.positionsList.map((p) => ({
        symbol: p.symbol,
        qty: p.qty,
        entryPrice: p.entryPrice,
        currentPrice: p.currentPrice,
        pl: p.pl,
        plPercent: p.plPercent,
        broker: broker.name,
      })),
    )

    return NextResponse.json({
      totalEquity,
      totalPL,
      totalPLPercent,
      activePositions,
      activeStrategies,
      lockedCapital,
      reserveCapital,
      plHistory,
      positions,
      brokers: state.brokers,
      allRunning: state.strategies.every((s) => s.running),
      scalpingProfit,
      scalpingTradeCount,
    })
  } catch (error) {
    console.error("[v0] Dashboard error:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 })
  }
}
