import { NextResponse } from "next/server"
import { toggleAllStrategies } from "@/lib/bot-state"

export async function POST(request: Request) {
  try {
    const { action } = await request.json()
    toggleAllStrategies(action)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Toggle all strategies error:", error)
    return NextResponse.json({ error: "Failed to toggle strategies" }, { status: 500 })
  }
}
