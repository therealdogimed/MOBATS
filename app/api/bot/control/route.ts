import { NextResponse } from "next/server"
import { getBotEngine } from "@/lib/bot-engine"

export async function POST(request: Request) {
  try {
    const { action } = await request.json()

    if (!action || !["start", "stop"].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "start" or "stop"' }, { status: 400 })
    }

    const engine = getBotEngine()

    if (action === "start") {
      await engine.start()
    } else {
      await engine.stop()
    }

    const status = await engine.getStatus()

    return NextResponse.json({
      success: true,
      isRunning: status.isRunning,
      message: `Bot ${action}ed successfully`,
    })
  } catch (error) {
    console.error("[v0] Control endpoint error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to control bot" },
      { status: 500 },
    )
  }
}
