import { NextResponse } from "next/server"
import { getStrategyEngine } from "@/lib/strategy-engine"
import { getErrorHandler } from "@/lib/error-handler"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const logger = getErrorHandler()

  try {
    const { action } = await request.json()
    const { id } = await params
    const engine = getStrategyEngine()

    if (action === "start") {
      await engine.startStrategy(id)
    } else if (action === "stop") {
      await engine.stopStrategy(id)
    } else {
      logger.log("warn", "StrategyControlAPI", `Invalid action: ${action}`)
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.log("error", "StrategyControlAPI", "Failed to control strategy", error)
    return NextResponse.json({ error: "Failed to toggle strategy" }, { status: 500 })
  }
}
