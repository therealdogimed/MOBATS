import { NextResponse } from "next/server"
import { getDataSourceManager } from "@/lib/data-sources"
import { getErrorHandler } from "@/lib/error-handler"

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const logger = getErrorHandler()

  try {
    const { id } = await params
    const manager = getDataSourceManager()
    await manager.removeSource(id)

    logger.log("info", "DataSourceAPI", `Removed data source: ${id}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.log("error", "DataSourceAPI", "Failed to remove data source", error)
    return NextResponse.json({ error: "Failed to remove data source" }, { status: 500 })
  }
}
