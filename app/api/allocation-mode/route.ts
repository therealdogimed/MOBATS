import { NextResponse } from "next/server"
import { getStrategyEngine, type AllocationMode } from "@/lib/strategy-engine"
import { getErrorHandler } from "@/lib/error-handler"

export async function POST(request: Request) {
  const logger = getErrorHandler()

  try {
    const { mode } = await request.json()
    const engine = getStrategyEngine()
    engine.setAllocationMode(mode as AllocationMode)

    logger.log("info", "AllocationModeAPI", `Changed allocation mode to ${mode}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.log("error", "AllocationModeAPI", "Failed to change allocation mode", error)
    return NextResponse.json({ error: "Failed to change allocation mode" }, { status: 500 })
  }
}
