import { NextResponse } from "next/server"
import { getBotState, updateSettings } from "@/lib/bot-state"

export async function GET() {
  try {
    const state = getBotState()
    return NextResponse.json(state.settings)
  } catch (error) {
    console.error("[v0] Get settings error:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const settings = await request.json()
    updateSettings(settings)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Update settings error:", error)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (body.action === "reinitialize_alpaca") {
      const { AlpacaClient } = await import("@/lib/alpaca-client")
      AlpacaClient.reinitialize()

      // Trigger immediate sync
      const { syncAlpacaData } = await import("@/lib/bot-state")
      await syncAlpacaData()

      console.log("[v0] Settings: Alpaca client reinitialized with new credentials")
      return NextResponse.json({ success: true, message: "Alpaca credentials updated" })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Settings action error:", error)
    return NextResponse.json({ error: "Failed to process action" }, { status: 500 })
  }
}
