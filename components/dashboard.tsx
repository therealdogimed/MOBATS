"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Play, Square, Power, Edit2, Check, X } from "lucide-react"
import { PLChart } from "@/components/pl-chart"
import { PositionsList } from "@/components/positions-list"
import { useIsMobile } from "@/hooks/use-mobile"
import { EmergencyControls } from "@/components/emergency-controls"

export function Dashboard() {
  const [dashboardStats, setDashboardStats] = useState<any>(null) // overall stats (PL, scalping profit)
  const [loading, setLoading] = useState(false)
  const [shuttingDown, setShuttingDown] = useState(false)
  const [editingCapital, setEditingCapital] = useState<string | null>(null)
  const [capitalInput, setCapitalInput] = useState("")
  const [brokers, setBrokers] = useState<any[]>([]) // per-broker state
  const isMobile = useIsMobile()

  /** Fetch overall dashboard stats */
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/stats")
      const data = await res.json()
      setDashboardStats(data)
    } catch (err) {
      console.error("[v0] Dashboard stats fetch error:", err)
    }
  }, [])

  /** Fetch all brokers individually and update state */
  const fetchBrokers = useCallback(async () => {
    try {
      const res = await fetch("/api/brokers")
      const data = await res.json()
      setBrokers(data)
    } catch (err) {
      console.error("[v0] Brokers fetch error:", err)
    }
  }, [])

  /** Poll stats and brokers separately */
  useEffect(() => {
    fetchStats()
    fetchBrokers()
    const interval = setInterval(() => {
      fetchStats()
      fetchBrokers()
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchStats, fetchBrokers])

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
    try {
      const res = await fetch("/api/strategies/shutdown", { method: "POST" })
      const result = await res.json()
      if (result.success) {
        await fetch("/api/control/all", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stop" }),
        })
        alert("Graceful shutdown completed.")
      } else {
        alert(`Graceful shutdown failed: ${result.error}`)
      }
    } catch {
      alert("Failed to initiate shutdown.")
    } finally {
      setShuttingDown(false)
    }
  }

  /** Update capital for a single broker and refresh only that broker */
  const handleUpdateCapital = async (brokerId: string) => {
    const cleanedInput = capitalInput.replace(/[$,\s]/g, "")
    const amount = Number.parseFloat(cleanedInput)
    if (isNaN(amount) || amount < 0) {
      alert("Invalid capital amount.")
      return
    }

    const broker = brokers.find((b) => b.id === brokerId)
    if (!broker) return

    const maxRecommended = broker.equity * 0.45
    if (amount > maxRecommended) {
      const confirmed = confirm(
        `Warning: Locked capital $${amount.toLocaleString()} exceeds recommended $${maxRecommended.toLocaleString()}. Continue?`
      )
      if (!confirmed) return
    }
    if (amount === 0) {
      alert("Locked capital cannot be zero.")
      return
    }

    try {
      const res = await fetch(`/api/brokers/${brokerId}/capital`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      })
      const result = await res.json()
      if (result.success) {
        setEditingCapital(null)
        setCapitalInput("")
        // Refresh only the updated broker
        fetchSingleBroker(brokerId)
      } else {
        alert(`Failed: ${result.error}`)
      }
    } catch {
      alert("Failed to update capital.")
    }
  }

  /** Fetch single broker */
  const fetchSingleBroker = async (brokerId: string) => {
    try {
      const res = await fetch(`/api/brokers/${brokerId}`)
      const updated = await res.json()
      setBrokers((prev) => prev.map((b) => (b.id === brokerId ? updated : b)))
    } catch (err) {
      console.error("[v0] Single broker fetch error:", err)
    }
  }

  /** Verify all brokers at once */
  const verifyAllBrokers = async () => {
    try {
      const res = await fetch("/api/brokers/verify-all", { method: "POST" })
      const result = await res.json()
      alert("Verification completed. Check console for details.")
      console.log(result)
      fetchBrokers() // refresh all brokers after verification
    } catch (err) {
      console.error(err)
      alert("Verification failed.")
    }
  }

  if (!dashboardStats) return <div className="flex items-center justify-center h-64">Loading...</div>

  return (
    <div className="space-y-6">
      <EmergencyControls />

      {dashboardStats.scalpingProfit > 0 && (
        <Card className="border-green-600/50 bg-green-950/20">
          <CardContent className="pt-4 flex justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Scalping Profit</p>
              <p className="text-2xl text-green-500 font-bold">+${dashboardStats.scalpingProfit.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Trades</p>
              <p className="text-xl font-semibold">{dashboardStats.scalpingTradeCount}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => toggleAllBots("start")} disabled={loading || dashboardStats.allRunning}>
          <Play className="mr-2 h-4 w-4" /> Start All
        </Button>
        <Button variant="destructive" onClick={() => toggleAllBots("stop")} disabled={loading || !dashboardStats.allRunning}>
          <Square className="mr-2 h-4 w-4" /> Stop All
        </Button>
        <Button variant="outline" onClick={handleGracefulShutdown} disabled={shuttingDown}>
          <Power className="mr-2 h-4 w-4" />
          {shuttingDown ? "Shutting Down..." : "Graceful Shutdown"}
        </Button>
        <Button variant="secondary" onClick={verifyAllBrokers}>Verify</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {brokers.map((broker) => (
          <BrokerCard
            key={broker.id}
            broker={broker}
            editingCapital={editingCapital}
            capitalInput={capitalInput}
            setEditingCapital={setEditingCapital}
            setCapitalInput={setCapitalInput}
            handleUpdateCapital={handleUpdateCapital}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <PLChart data={dashboardStats.plHistory} />
        <PositionsList positions={dashboardStats.positions} />
      </div>
    </div>
  )
}

interface BrokerCardProps {
  broker: any
  editingCapital: string | null
  capitalInput: string
  setEditingCapital: (id: string | null) => void
  setCapitalInput: (val: string) => void
  handleUpdateCapital: (id: string) => void
}

function BrokerCard({ broker, editingCapital, capitalInput, setEditingCapital, setCapitalInput, handleUpdateCapital }: BrokerCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <CardTitle>{broker.name}</CardTitle>
          <Badge variant={broker.connected ? "default" : "secondary"}>
            {broker.connected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Equity */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Equity</span>
          <span>${broker.equity.toLocaleString()}</span>
        </div>

        {/* Buying Power */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Buying Power</span>
          <span className="text-green-600">${broker.buyingPower.toLocaleString()}</span>
        </div>

        {/* Locked Capital */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Locked Capital</span>
          {editingCapital === broker.id ? (
            <div className="flex items-center gap-1">
              <Input value={capitalInput} onChange={(e) => setCapitalInput(e.target.value)} className="h-7 w-24 text-xs" />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleUpdateCapital(broker.id)}>
                <Check className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingCapital(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="font-medium text-blue-600">${broker.lockedTradingCapital.toLocaleString()}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                setEditingCapital(broker.id)
                setCapitalInput(broker.lockedTradingCapital?.toString() || "")
              }}>
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* P/L */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">P/L</span>
          <span className={broker.pl >= 0 ? "text-green-600" : "text-red-600"}>
            {broker.pl >= 0 ? "+" : ""}${broker.pl.toFixed(2)}
          </span>
        </div>

        {/* Positions */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Positions</span>
          <span>{broker.positions}</span>
        </div>
      </CardContent>
    </Card>
  )
}
