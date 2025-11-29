import { NextResponse } from "next/server"
import { getBotState } from "@/lib/bot-state"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    console.log(`[v0] API: Stopping broker ${id}`)

    const state = getBotState()
    const broker = state.brokers.find((b) => b.id === id)

    if (!broker) {
      return NextResponse.json({ success: false, error: "Broker not found" }, { status: 404 })
    }

    // Stop all strategies using this broker
    state.strategies.forEach((strategy) => {
      if (strategy.running) {
        strategy.running = false
        console.log(`[v0] API: Stopped strategy ${strategy.name} for broker ${broker.name}`)
      }
    })

    console.log(`[v0] API: Successfully stopped broker ${broker.name}`)

    return NextResponse.json({
      success: true,
      message: `Stopped all strategies for ${broker.name}`,
      brokerId: id,
      brokerName: broker.name,
    })
  } catch (error) {
    console.error("[v0] API: Stop broker error:", error)
    return NextResponse.json({ success: false, error: "Failed to stop broker" }, { status: 500 })
  }
}
