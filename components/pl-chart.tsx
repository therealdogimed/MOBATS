"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

interface PLChartProps {
  refreshInterval?: number // in ms, optional
}

interface PLDataPoint {
  time: string
  value: number
}

export function PLChart({ refreshInterval = 5000 }: PLChartProps) {
  const [data, setData] = useState<PLDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPLData = async () => {
    try {
      const res = await fetch("/api/dashboard/pl") // dedicated endpoint for P/L history
      const result = await res.json()
      if (Array.isArray(result)) {
        setData(result)
      }
    } catch (err) {
      console.error("[PLChart] fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPLData()
    const interval = setInterval(fetchPLData, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">P/L Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            Loading P/L data...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">P/L Chart (Live Data)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground text-sm gap-2">
            <p>No P/L data available.</p>
            <p className="text-xs">Connect to a broker API with valid credentials to see live P/L tracking.</p>
            <p className="text-xs text-yellow-500">Chart displays real-time data from your broker account.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">P/L Chart</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
            />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
