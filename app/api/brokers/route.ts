import { NextResponse } from "next/server"
import { getBotState, addBroker } from "@/lib/bot-state"

export async function GET() {
  try {
    const state = getBotState()
    return NextResponse.json({ brokers: state.brokers })
  } catch (error) {
    console.error("[v0] Get brokers error:", error)
    return NextResponse.json({ error: "Failed to fetch brokers" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const broker = addBroker(body)
    return NextResponse.json({ broker })
  } catch (error) {
    console.error("[v0] Add broker error:", error)
    return NextResponse.json({ error: "Failed to add broker" }, { status: 500 })
  }
}
