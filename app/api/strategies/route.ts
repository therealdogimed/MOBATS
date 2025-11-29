import { NextResponse } from "next/server"
import { getStrategyEngine } from "@/lib/strategy-engine"
import { getErrorHandler } from "@/lib/error-handler"

export async function GET() {
  try {
    const engine = getStrategyEngine()
    const strategies = engine.getStrategies()
    return NextResponse.json({ strategies })
  } catch (error) {
    const logger = getErrorHandler()
    logger.log("error", "StrategiesAPI", "Failed to fetch strategies", error)
    return NextResponse.json({ error: "Failed to fetch strategies" }, { status: 500 })
  }
}
