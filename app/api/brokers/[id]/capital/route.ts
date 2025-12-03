import { type NextRequest, NextResponse } from "next/server"
import { updateBrokerTradingCapital, getBotState } from "@/lib/bot-state"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { amount } = await request.json()
    const { id: brokerId } = await params

    console.log("[v0] Capital API: Received request", { brokerId, amount, type: typeof amount })

    if (typeof amount !== "number" || amount < 0) {
      console.error("[v0] Capital API: Invalid amount type or value", { amount, type: typeof amount })
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    const botState = getBotState()
    const broker = botState.brokers.find((b) => b.id === brokerId)

    if (!broker) {
      console.error("[v0] Capital API: Broker not found", { brokerId })
      return NextResponse.json({ error: "Broker not found" }, { status: 404 })
    }

    console.log("[v0] Capital API: Current broker state", {
      brokerId,
      currentEquity: broker.equity,
      currentBuyingPower: broker.buyingPower,
      requestedCapital: amount,
    })

    // Update the capital
    updateBrokerTradingCapital(brokerId, amount)

    console.log("[v0] Capital API: Updated trading capital successfully", {
      brokerId,
      amount,
      lockedCapital: broker.lockedTradingCapital,
      reserveCapital: broker.reserveCapital,
    })

    return NextResponse.json({
      success: true,
      lockedCapital: broker.lockedTradingCapital,
      reserveCapital: broker.reserveCapital,
    })
  } catch (error) {
    console.error("[v0] Capital API: Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
