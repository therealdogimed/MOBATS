"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Play, Square, Plus, DollarSign } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

export function StrategyManager() {
  const [strategies, setStrategies] = useState<any[]>([])
  const [allocationMode, setAllocationMode] = useState<"three-way" | "two-way" | "single">("three-way")
  const isMobile = useIsMobile()

  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        const response = await fetch("/api/strategies")
        const data = await response.json()
        setStrategies(data.strategies)
      } catch (err) {
        console.error("[v0] Fetch strategies error:", err)
      }
    }

    fetchStrategies()
    const interval = setInterval(fetchStrategies, 3000)
    return () => clearInterval(interval)
  }, [])

  const toggleStrategy = async (id: string, action: "start" | "stop") => {
    try {
      await fetch(`/api/strategies/${id}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
    } catch (err) {
      console.error("[v0] Toggle strategy error:", err)
    }
  }

  const updateAllocation = async (id: string, allocation: number) => {
    try {
      await fetch(`/api/strategies/${id}/allocation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allocation }),
      })
    } catch (err) {
      console.error("[v0] Update allocation error:", err)
    }
  }

  const changeAllocationMode = async (mode: typeof allocationMode) => {
    try {
      await fetch("/api/allocation-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      })
      setAllocationMode(mode)
    } catch (err) {
      console.error("[v0] Change allocation mode error:", err)
    }
  }

  const updateStrategyParam = (id: string, param: string, value: number) => {
    setStrategies(strategies.map((s) => (s.id === id ? { ...s, [param]: value } : s)))
  }

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg md:text-xl font-semibold">Trading Strategies</h2>
        <Button size={isMobile ? "default" : "sm"} className="w-full md:w-auto min-h-[44px]">
          <Plus className="mr-2 h-4 w-4" />
          Create Strategy
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm md:text-base">Allocation Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 md:flex-row">
            <Button
              size={isMobile ? "default" : "sm"}
              variant={allocationMode === "three-way" ? "default" : "outline"}
              onClick={() => changeAllocationMode("three-way")}
              className="w-full md:w-auto min-h-[44px]"
            >
              50/25/25 Split
            </Button>
            <Button
              size={isMobile ? "default" : "sm"}
              variant={allocationMode === "two-way" ? "default" : "outline"}
              onClick={() => changeAllocationMode("two-way")}
              className="w-full md:w-auto min-h-[44px]"
            >
              60/40 Split
            </Button>
            <Button
              size={isMobile ? "default" : "sm"}
              variant={allocationMode === "single" ? "default" : "outline"}
              onClick={() => changeAllocationMode("single")}
              className="w-full md:w-auto min-h-[44px]"
            >
              Single Strategy
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {allocationMode === "three-way" && "2 high volatility strategies (25% each) + 1 medium volatility (50%)"}
            {allocationMode === "two-way" && "Primary strategy (60%) + Secondary strategy (40%)"}
            {allocationMode === "single" && "All capital allocated to single strategy (100%)"}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:gap-4">
        {strategies.map((strategy) => (
          <Card key={strategy.id}>
            <CardHeader>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-sm md:text-base">{strategy.name}</CardTitle>
                    {strategy.type === "profit-taking" && (
                      <Badge variant="outline" className="text-green-600">
                        <DollarSign className="h-3 w-3 mr-1" />${strategy.minProfit || 5} Target
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{strategy.type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={strategy.running ? "default" : "secondary"}>
                    {strategy.running ? "Running" : "Stopped"}
                  </Badge>
                  <Button
                    size={isMobile ? "default" : "sm"}
                    variant={strategy.running ? "destructive" : "default"}
                    onClick={() => toggleStrategy(strategy.id, strategy.running ? "stop" : "start")}
                    className="min-h-[44px] min-w-[44px]"
                  >
                    {strategy.running ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Allocation</p>
                  <p className="text-base md:text-lg font-semibold">{strategy.allocation}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">P/L Today</p>
                  <p
                    className={`text-base md:text-lg font-semibold ${strategy.plToday >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {strategy.plToday >= 0 ? "+" : ""}${strategy.plToday.toFixed(2)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Total P/L</p>
                  <p
                    className={`text-base md:text-lg font-semibold ${strategy.plTotal >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {strategy.plTotal >= 0 ? "+" : ""}${strategy.plTotal.toFixed(2)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                  <p className="text-base md:text-lg font-semibold">{strategy.winRate}%</p>
                </div>
              </div>

              {strategy.type !== "profit-taking" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Equity Allocation</Label>
                    <span className="text-sm font-medium">{strategy.allocation}%</span>
                  </div>
                  <Slider
                    value={[strategy.allocation]}
                    onValueChange={(value) => updateAllocation(strategy.id, value[0])}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              )}

              <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Stop Loss</Label>
                  <Input
                    type="number"
                    value={strategy.stopLoss}
                    onChange={(e) => updateStrategyParam(strategy.id, "stopLoss", Number(e.target.value))}
                    className="h-11 md:h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Take Profit</Label>
                  <Input
                    type="number"
                    value={strategy.takeProfit}
                    onChange={(e) => updateStrategyParam(strategy.id, "takeProfit", Number(e.target.value))}
                    className="h-11 md:h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max Position Size</Label>
                  <Input
                    type="number"
                    value={strategy.maxPositionSize}
                    onChange={(e) => updateStrategyParam(strategy.id, "maxPositionSize", Number(e.target.value))}
                    className="h-11 md:h-8"
                  />
                </div>
              </div>

              {strategy.type === "profit-taking" && (
                <div className="space-y-1">
                  <Label className="text-sm">Minimum Profit Per Trade</Label>
                  <Input
                    type="number"
                    value={strategy.minProfit || 5}
                    onChange={(e) => updateStrategyParam(strategy.id, "minProfit", Number(e.target.value))}
                    className="h-11 md:h-9"
                    step={0.5}
                    min={1}
                  />
                  <p className="text-xs text-muted-foreground">Sell any position when profit reaches this amount</p>
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border p-4 md:p-3">
                <div>
                  <p className="text-sm font-medium">AI-Powered Optimization</p>
                  <p className="text-xs text-muted-foreground">Automatically adjust based on performance</p>
                </div>
                <Switch checked={strategy.aiOptimization} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
