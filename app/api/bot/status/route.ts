import { NextResponse } from "next/server"
import { getBotEngine } from "@/lib/bot-engine"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const engine = getBotEngine()
    const status = await engine.getStatus()

    return NextResponse.json(status)
  } catch (error) {
    console.error("[v0] Status endpoint error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get status",
        isRunning: false,
        positions: [],
        accountValue: "0",
        buyingPower: "0",
        lastUpdate: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
