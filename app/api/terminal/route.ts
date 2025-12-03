import { NextResponse } from "next/server"
import { generateTerminalOutput } from "@/lib/terminal-generator"

export async function GET() {
  try {
    const output = generateTerminalOutput()
    return NextResponse.json({ output })
  } catch (error) {
    console.error("[v0] Terminal error:", error)
    return NextResponse.json({ error: "Failed to generate terminal output" }, { status: 500 })
  }
}
