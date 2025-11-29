"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Play, Square, Power, TrendingUp, Edit2, Check, X } from "lucide-react"
import { PLChart } from "@/components/pl-chart"
import { PositionsList } from "@/components/positions-list"
import { useIsMobile } from "@/hooks/use-mobile"

export function Dashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [shuttingDown, setShuttingDown] = useState(false)
  const [editingCapital, setEditingCapital] = useState<string | null>(null)
  const [capitalInput, setCapitalInput] = useState("")
  const [selectedBroker, setSelectedBroker] = useState<string | "all">("all")
  const isMobile = useIsMobile()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/dashboard")
        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error("[v0] Dashboard fetch error:", err)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const toggleAllBots = async (action: "start" | "stop") => {
    setLoading(true)
    try {
      await fetch("/api/control/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
    } catch (err) {
      console.error("[v0] Control error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleGracefulShutdown = async () => {
    setShuttingDown(true)
    console.log("[v0] Dashboard: User initiated graceful shutdown")

    try {
      const response = await fetch("/api/strategies/shutdown", {
        method: "POST",
      })

      const result = await response.json()
      console.log("[v0] Dashboard: Shutdown API response:", result)

      if (result.success) {
        console.log("[v0] Dashboard: Graceful shutdown completed successfully")

        await fetch("/api/control/all", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stop" }),
        })

        alert("Graceful shutdown completed. All strategies stopped. High volatility positions closed, others saved.")
      } else {
        console.error("[v0] Dashboard: Graceful shutdown failed:", result.error)
        alert(`Graceful shutdown failed: ${result.error}`)
      }
    } catch (err) {
      console.error("[v0] Dashboard: Shutdown request error:", err)
      alert("Failed to initiate shutdown. Check console for details.")
    } finally {
      setShuttingDown(false)
    }
  }

  const handleUpdateCapital = async (brokerId: string) => {
    const cleanedInput = capitalInput.replace(/[$,\s]/g, "")
    const amount = Number.parseFloat(cleanedInput)

    if (isNaN(amount) || amount < 0) {
      console.error("[v0] Dashboard: Invalid capital amount:", capitalInput, "cleaned:", cleanedInput)
      alert(`Invalid capital amount: ${capitalInput}. Please enter a valid number.`)
      return
    }

    const broker = data.brokers.find((b: any) => b.id === brokerId)
    if (broker) {
      const maxRecommended = broker.equity * 0.45

      if (amount > maxRecommended) {
        const confirmed = confirm(
          `⚠️ Warning: You're setting locked capital to $${amount.toLocaleString()}, which is ${((amount / broker.equity) * 100).toFixed(1)}% of your equity.\n\n` +
            `We recommend using no more than 45% ($${maxRecommended.toLocaleString()}) to maintain safety margin.\n\n` +
            `Do you want to continue anyway?`,
        )

        if (!confirmed) {
          return
        }
      }

      if (amount === 0) {
        alert(
          "⚠️ Locked capital cannot be set to zero.\n\n" +
            "Strategies will not execute without allocated capital. Please set a positive amount.",
        )
        return
      }
    }

    console.log("[v0] Dashboard: Updating capital", { brokerId, amount, input: capitalInput })

    try {
      const response = await fetch(`/api/brokers/${brokerId}/capital`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      })

      const result = await response.json()
      console.log("[v0] Dashboard: Capital update response", result)

      if (result.success) {
        setEditingCapital(null)
        setCapitalInput("")
        console.log("[v0] Dashboard: Capital updated successfully")

        const percentage = ((amount / broker.equity) * 100).toFixed(1)
        alert(
          `✅ Locked capital set to $${amount.toLocaleString()} (${percentage}% of equity).\n\nStrategies can now execute with this allocated capital.`,
        )
      } else {
        console.error("[v0] Dashboard: Capital update failed", result.error)
        alert(`Failed to update capital: ${result.error}`)
      }
    } catch (err) {
      console.error("[v0] Dashboard: Update capital error:", err)
      alert("Failed to update capital. Check console for details.")
    }
  }

  const cycleBrokerView = () => {
    if (!data || !data.brokers) return

    if (selectedBroker === "all") {
      setSelectedBroker(data.brokers[0]?.id || "all")
    } else {
      const currentIndex = data.brokers.findIndex((b: any) => b.id === selectedBroker)
      const nextIndex = (currentIndex + 1) % (data.brokers.length + 1)

      if (nextIndex === data.brokers.length) {
        setSelectedBroker("all")
      } else {
        setSelectedBroker(data.brokers[nextIndex]?.id || "all")
      }
    }
  }

  if (!data) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  const maxUsableEquity = data.totalEquity * 0.45
  const reservedEquity = data.totalEquity - maxUsableEquity

  const displayData =
    selectedBroker === "all"
      ? data
      : {
          ...data,
          totalEquity: data.brokers.find((b: any) => b.id === selectedBroker)?.equity || 0,
          lockedCapital: data.brokers.find((b: any) => b.id === selectedBroker)?.lockedTradingCapital || 0,
          totalPL: data.brokers.find((b: any) => b.id === selectedBroker)?.pl || 0,
          totalPLPercent:
            (data.brokers.find((b: any) => b.id === selectedBroker)?.pl /
              data.brokers.find((b: any) => b.id === selectedBroker)?.equity) *
              100 || 0,
          activePositions: data.brokers.find((b: any) => b.id === selectedBroker)?.positions || 0,
          reserveCapital: data.brokers.find((b: any) => b.id === selectedBroker)?.reserveCapital || 0,
        }

  return (
    <div className="space-y-3 md:space-y-4">
      {data.scalpingProfit > 0 && (
        <Card className="border-green-600/50 bg-green-950/20">
          <CardContent className="pt-4 md:pt-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-600/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Scalping Profits</p>
                  <p className="text-xl md:text-2xl font-bold text-green-500">+${data.scalpingProfit.toFixed(2)}</p>
                </div>
              </div>
              <div className="text-left md:text-right">
                <p className="text-xs md:text-sm text-muted-foreground">Scalping Trades</p>
                <p className="text-lg md:text-xl font-semibold">{data.scalpingTradeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg md:text-xl font-semibold">Portfolio Overview</h2>
        <div className="flex flex-col gap-2 md:flex-row">
          <Button
            onClick={() => toggleAllBots("start")}
            disabled={loading || data.allRunning}
            size={isMobile ? "default" : "sm"}
            variant="default"
            className="w-full md:w-auto min-h-[44px]"
          >
            <Play className="mr-2 h-4 w-4" />
            Start All
          </Button>
          <Button
            onClick={() => toggleAllBots("stop")}
            disabled={loading || !data.allRunning}
            size={isMobile ? "default" : "sm"}
            variant="destructive"
            className="w-full md:w-auto min-h-[44px]"
          >
            <Square className="mr-2 h-4 w-4" />
            Stop All
          </Button>
          <Button
            onClick={handleGracefulShutdown}
            disabled={shuttingDown}
            size={isMobile ? "default" : "sm"}
            variant="outline"
            className="w-full md:w-auto min-h-[44px] bg-transparent"
          >
            <Power className="mr-2 h-4 w-4" />
            {shuttingDown ? "Shutting Down..." : "Graceful Shutdown"}
          </Button>
        </div>
      </div>

      <Card className="border-purple-600/30 bg-purple-950/10 cursor-pointer" onClick={cycleBrokerView}>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {selectedBroker === "all"
                  ? "All Brokers"
                  : data.brokers.find((b: any) => b.id === selectedBroker)?.name || "Unknown"}
              </Badge>
              <span className="text-xs text-muted-foreground">Tap to cycle views</span>
            </div>
            <span className="text-xs text-purple-400">
              {selectedBroker === "all" ? `${data.brokers.length} brokers` : "1 broker"}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
        <Card onClick={cycleBrokerView} className="cursor-pointer hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle
              className={`font-medium ${selectedBroker === "all" ? "text-xs md:text-sm" : "text-[10px] md:text-xs"}`}
            >
              Total Equity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`font-bold ${selectedBroker === "all" ? "text-lg md:text-2xl" : "text-base md:text-xl"}`}>
              ${displayData.totalEquity.toLocaleString()}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Current total value</p>
          </CardContent>
        </Card>

        <Card onClick={cycleBrokerView} className="cursor-pointer hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle
              className={`font-medium ${selectedBroker === "all" ? "text-xs md:text-sm" : "text-[10px] md:text-xs"}`}
            >
              Locked Trading Capital
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`font-bold text-blue-600 ${selectedBroker === "all" ? "text-lg md:text-2xl" : "text-base md:text-xl"}`}
            >
              ${displayData.lockedCapital.toLocaleString()}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Fixed investment amount</p>
          </CardContent>
        </Card>

        <Card onClick={cycleBrokerView} className="cursor-pointer hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle
              className={`font-medium ${selectedBroker === "all" ? "text-xs md:text-sm" : "text-[10px] md:text-xs"}`}
            >
              Total P/L
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`font-bold ${displayData.totalPL >= 0 ? "text-green-600" : "text-red-600"} ${selectedBroker === "all" ? "text-lg md:text-2xl" : "text-base md:text-xl"}`}
            >
              {displayData.totalPL >= 0 ? "+" : ""}${displayData.totalPL.toFixed(2)}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
              {displayData.totalPLPercent >= 0 ? "+" : ""}
              {displayData.totalPLPercent.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        <Card onClick={cycleBrokerView} className="cursor-pointer hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle
              className={`font-medium ${selectedBroker === "all" ? "text-xs md:text-sm" : "text-[10px] md:text-xs"}`}
            >
              Active Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`font-bold ${selectedBroker === "all" ? "text-lg md:text-2xl" : "text-base md:text-xl"}`}>
              {displayData.activePositions}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Open trades</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-blue-600/30 bg-blue-950/10" onClick={cycleBrokerView}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm md:text-base">
            Capital Allocation (Fixed) -{" "}
            {selectedBroker === "all" ? "All Brokers" : data.brokers.find((b: any) => b.id === selectedBroker)?.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Locked for Trading</p>
              <p className="text-base md:text-lg font-semibold text-blue-600">
                ${displayData.lockedCapital.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">Does not fluctuate</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reserve + Profits</p>
              <p className="text-base md:text-lg font-semibold text-green-600">
                ${displayData.reserveCapital.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">Profits accumulate here</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Strategies</p>
              <p className="text-base md:text-lg font-semibold">{data.activeStrategies} Running</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:gap-4 grid-cols-1 lg:grid-cols-2">
        <PLChart data={data.plHistory} />
        <PositionsList positions={data.positions} />
      </div>

      {data.brokers.every((b: any) => !b.connected) && (
        <Card className="border-yellow-600/50 bg-yellow-950/20">
          <CardContent className="pt-4">
            <p className="text-sm text-yellow-200">
              ⚠️ No brokers are connected. Configure API credentials in the Brokers tab to see live data.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {data.brokers.map((broker: any) => (
          <Card key={broker.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm md:text-base">{broker.name}</CardTitle>
                <Badge variant={broker.connected ? "default" : "secondary"}>
                  {broker.connected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-muted-foreground">Total Equity:</span>
                <span className="font-medium">${broker.equity.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-muted-foreground">Buying Power:</span>
                <span className="font-medium text-green-600">${broker.buyingPower.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs md:text-sm">
                <span className="text-muted-foreground">Locked Capital:</span>
                {editingCapital === broker.id ? (
                  <div className="flex gap-1 items-center">
                    <Input
                      type="text"
                      value={capitalInput}
                      onChange={(e) => setCapitalInput(e.target.value)}
                      className="h-7 w-24 text-xs"
                      placeholder="Amount"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleUpdateCapital(broker.id)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingCapital(null)
                        setCapitalInput("")
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-1 items-center">
                    <span className="font-medium text-blue-600">${broker.lockedTradingCapital.toLocaleString()}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => {
                        setEditingCapital(broker.id)
                        setCapitalInput(broker.lockedTradingCapital.toString())
                      }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-muted-foreground">Reserve:</span>
                <span className="font-medium text-green-600">${broker.reserveCapital.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-muted-foreground">P/L:</span>
                <span className={`font-medium ${broker.pl >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {broker.pl >= 0 ? "+" : ""}${broker.pl.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-muted-foreground">Positions:</span>
                <span className="font-medium">{broker.positions}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
