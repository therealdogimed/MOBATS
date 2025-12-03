import { NextResponse } from "next/server"
import { getDataSourceManager, type DataSource } from "@/lib/data-sources"
import { getErrorHandler } from "@/lib/error-handler"

export async function GET() {
  const logger = getErrorHandler()

  try {
    const manager = getDataSourceManager()
    const sources = manager.getSources()
    return NextResponse.json({ sources })
  } catch (error) {
    logger.log("error", "DataSourcesAPI", "Failed to fetch data sources", error)
    return NextResponse.json({ error: "Failed to fetch data sources" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const logger = getErrorHandler()

  try {
    const source: DataSource = await request.json()
    const manager = getDataSourceManager()
    await manager.addSource(source)

    logger.log("info", "DataSourcesAPI", `Added data source: ${source.name}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.log("error", "DataSourcesAPI", "Failed to add data source", error)
    return NextResponse.json({ error: "Failed to add data source" }, { status: 500 })
  }
}
