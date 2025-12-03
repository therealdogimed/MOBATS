import { NextResponse } from "next/server"
import { createAlpacaClient } from "@/lib/alpaca-client"
import { getAlpacaBroker } from "@/lib/bot-state"

export async function GET() {
  try {
    const alpacaBroker = getAlpacaBroker()

    if (!alpacaBroker) {
      return NextResponse.json({
        success: false,
        error: "No Alpaca broker configured. Please add an Alpaca broker first.",
      })
    }

    if (!alpacaBroker.apiKey || !alpacaBroker.apiSecret) {
      return NextResponse.json({
        success: false,
        error: "Alpaca broker has no API credentials. Please configure API Key and Secret in the broker settings.",
      })
    }

    const client = createAlpacaClient(alpacaBroker.apiKey, alpacaBroker.apiSecret, alpacaBroker.mode)

    if (!client.isConfigured()) {
      return NextResponse.json({
        success: false,
        error: "Alpaca API credentials not configured properly.",
      })
    }

    const verification = await client.verifyConnection()

    if (verification.success) {
      const clock = await client.getClock()
      const marketStatus = clock.is_open ? "OPEN ✅" : "CLOSED ⚠️"

      return NextResponse.json({
        success: true,
        mode: client.getMode(),
        marketStatus,
        marketOpen: clock.is_open,
        nextOpen: clock.next_open,
        nextClose: clock.next_close,
        account: {
          account_number: verification.account.account_number,
          status: verification.account.status,
          equity: verification.account.equity,
          buying_power: verification.account.buying_power,
          cash: verification.account.cash,
          trading_blocked: verification.account.trading_blocked,
          pattern_day_trader: verification.account.pattern_day_trader,
        },
      })
    } else {
      return NextResponse.json({
        success: false,
        error: verification.error || "Connection verification failed",
      })
    }
  } catch (error) {
    console.error("[v0] Alpaca verify error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
