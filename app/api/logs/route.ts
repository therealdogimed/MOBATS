import { NextResponse } from "next/server"
import { getErrorHandler } from "@/lib/error-handler"

export async function GET(request: Request) {
  const logger = getErrorHandler()

  try {
    const { searchParams } = new URL(request.url)
    const level = searchParams.get("level") as any
    const component = searchParams.get("component") || undefined

    const logs = logger.getLogs({ level, component })
    return NextResponse.json({ logs })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
  }
}

export async function DELETE() {
  const logger = getErrorHandler()

  try {
    logger.clearLogs()
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to clear logs" }, { status: 500 })
  }
}
