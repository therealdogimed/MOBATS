import { NextResponse } from "next/server"
import { removeBroker, getBotState, updateBrokerCredentials } from "@/lib/bot-state"

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    removeBroker(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Remove broker error:", error)
    return NextResponse.json({ error: "Failed to remove broker" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { apiKey, apiSecret } = body

    console.log("[v0] Update broker credentials:", {
      id,
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret,
    })

    const botState = getBotState()
    const broker = botState.brokers.find((b) => b.id === id)

    if (!broker) {
      return NextResponse.json({ success: false, error: "Broker not found" }, { status: 404 })
    }

    updateBrokerCredentials(id, apiKey, apiSecret)

    console.log("[v0] Broker credentials updated successfully")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Update broker error:", error)
    return NextResponse.json({ error: "Failed to update broker" }, { status: 500 })
  }
}
