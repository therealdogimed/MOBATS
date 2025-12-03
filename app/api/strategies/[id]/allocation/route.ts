import { NextResponse } from "next/server"
import { getStrategyEngine } from "@/lib/strategy-engine"
import { getErrorHandler } from "@/lib/error-handler"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const logger = getErrorHandler()

  try {
    const { allocation } = await request.json()
    const { id } = await params
    const engine = getStrategyEngine()
    engine.updateStrategyAllocation(id, allocation)

    logger.log("info", "AllocationAPI", `Updated allocation for ${id}`, null, { allocation })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.log("error", "AllocationAPI", "Failed to update allocation", error)
    return NextResponse.json({ error: "Failed to update allocation" }, { status: 500 })
  }
}
