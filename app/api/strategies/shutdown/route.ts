import { NextResponse } from "next/server"
import { getStrategyEngine } from "@/lib/strategy-engine"
import { getErrorHandler } from "@/lib/error-handler"

export async function POST() {
  const logger = getErrorHandler()

  try {
    const engine = getStrategyEngine()
    await engine.gracefulShutdown()

    logger.log("info", "ShutdownAPI", "Graceful shutdown completed")

    return NextResponse.json({
      success: true,
      message: "System gracefully shut down",
    })
  } catch (error) {
    logger.log("error", "ShutdownAPI", "Shutdown failed", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
