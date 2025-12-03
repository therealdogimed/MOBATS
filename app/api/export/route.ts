import { NextResponse } from "next/server"
import { getBotState } from "@/lib/bot-state"

export async function GET() {
  try {
    const state = getBotState()

    const exportData = {
      timestamp: new Date().toISOString(),
      totalEquity: state.brokers.reduce((sum, b) => sum + b.equity, 0),
      totalPL: state.brokers.reduce((sum, b) => sum + b.pl, 0),
      brokers: state.brokers.map((b) => ({
        name: b.name,
        type: b.type,
        equity: b.equity,
        pl: b.pl,
        positions: b.positionsList,
      })),
      strategies: state.strategies.map((s) => ({
        name: s.name,
        type: s.type,
        running: s.running,
        plToday: s.plToday,
        plTotal: s.plTotal,
        winRate: s.winRate,
      })),
      recentTransactions: state.transactions.slice(-100),
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="trading-data-${Date.now()}.json"`,
      },
    })
  } catch (error) {
    console.error("[v0] Export error:", error)
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 })
  }
}
