"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Position {
  symbol: string
  qty: number
  entryPrice: number
  currentPrice: number
  pl: number
  plPercent: number
  broker: string
}

interface PositionsListProps {
  refreshInterval?: number // optional, default 5000ms
}

export function PositionsList({ refreshInterval = 5000 }: PositionsListProps) {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPositions = async () => {
    try {
      const res = await fetch("/api/dashboard/positions") // dedicated endpoint
      const result = await res.json()
      if (Array.isArray(result)) {
        setPositions(result)
      }
    } catch (err) {
      console.error("[PositionsList] fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPositions()
    const interval = setInterval(fetchPositions, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Open Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            Loading positions...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!positions || positions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Open Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No open positions</p>
            <p className="text-xs text-muted-foreground mt-1">
              Positions will appear here when trades are executed
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Open Positions</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[250px]">
          <div className="space-y-2">
            {positions.map((position, idx) => {
              const isProfit = position.pl >= 0

              return (
                <div key={idx} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${isProfit ? "bg-green-500/10" : "bg-red-500/10"}`}>
                      {isProfit ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{position.symbol}</div>
                      <div className="text-xs text-muted-foreground">
                        {position.qty} @ ${position.entryPrice.toFixed(2)} • {position.broker}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-sm font-semibold ${isProfit ? "text-green-600" : "text-red-600"}`}>
                      {isProfit ? "+" : ""}${position.pl.toFixed(2)}
                    </div>
                    <div className={`text-xs ${isProfit ? "text-green-600" : "text-red-600"}`}>
                      {isProfit ? "+" : ""}
                      {position.plPercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
