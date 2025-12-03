"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, Settings, Square, AlertCircle } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DashboardEmergency } from "./dashboard-emergency"

export function BrokerManager() {
  const [brokers, setBrokers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const [showAddForm, setShowAddForm] = useState(false)
  const [isLiveMode, setIsLiveMode] = useState(false)

  const [configuringBroker, setConfiguringBroker] = useState<any>(null)
  const [configApiKey, setConfigApiKey] = useState("")
  const [configApiSecret, setConfigApiSecret] = useState("")
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  const isMobile = useIsMobile()

  const hasPlaceholderCredentials = brokers.some(
    (b) =>
      String(b.type || "").toLowerCase() === "alpaca" &&
      (!b.apiKey || !b.apiSecret || b.apiKey === "your-api-key" || b.apiSecret === "your-api-secret")
  )

  const fetchBrokers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/brokers")
      const data = await response.json()
      if (data?.brokers && Array.isArray(data.brokers)) setBrokers(data.brokers)
      else setBrokers([])
    } catch (err) {
      console.error("[v0] Fetch brokers error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBrokers()
    const interval = setInterval(fetchBrokers, 5000)
    return () => clearInterval(interval)
  }, [fetchBrokers, refreshKey])

  const refresh = () => setRefreshKey((k) => k + 1)

  const addBroker = async (formData: any) => {
    setActionLoading((s) => ({ ...s, add: true }))
    try {
      await fetch("/api/brokers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      setShowAddForm(false)
      refresh()
    } catch (err) {
      console.error("[v0] Add broker error:", err)
      alert("❌ Failed to add broker. Check console for details.")
    } finally {
      setActionLoading((s) => ({ ...s, add: false }))
    }
  }

  const removeBroker = async (id: string) => {
    if (!confirm("Are you sure you want to remove this broker?")) return
    setActionLoading((s) => ({ ...s, [id]: true }))
    try {
      await fetch(`/api/brokers/${id}`, { method: "DELETE" })
      refresh()
    } catch (err) {
      console.error("[v0] Remove broker error:", err)
      alert("❌ Failed to remove broker.")
    } finally {
      setActionLoading((s) => ({ ...s, [id]: false }))
    }
  }

  const updateBrokerConfig = async () => {
    if (!configuringBroker) return
    const brokerId = configuringBroker.id
    setActionLoading((s) => ({ ...s, [`cfg-${brokerId}`]: true }))
    try {
      await fetch(`/api/brokers/${brokerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: configApiKey || null,
          apiSecret: configApiSecret || null,
        }),
      })
      setConfiguringBroker(null)
      setConfigApiKey("")
      setConfigApiSecret("")
      alert("✅ Credentials updated! The system will verify the connection automatically.")
      refresh()
    } catch (err) {
      console.error("[v0] Update broker config error:", err)
      alert("❌ Failed to update credentials. Please try again.")
    } finally {
      setActionLoading((s) => ({ ...s, [`cfg-${brokerId}`]: false }))
    }
  }

  const stopBroker = async (brokerId: string) => {
    if (!confirm("Stop this broker? This will attempt to stop strategies associated with it.")) return
    setActionLoading((s) => ({ ...s, [`stop-${brokerId}`]: true }))
    try {
      await fetch(`/api/brokers/${brokerId}/stop`, { method: "POST" })
      alert("✅ Broker stopped successfully")
      refresh()
    } catch (err) {
      console.error("[v0] Stop broker error:", err)
      alert("❌ Failed to stop broker")
    } finally {
      setActionLoading((s) => ({ ...s, [`stop-${brokerId}`]: false }))
    }
  }

  const verifyAllBrokers = async () => {
    setActionLoading((s) => ({ ...s, verifyAll: true }))
    try {
      const res = await fetch("/api/brokers/verify-all", { method: "POST" })
      const data = await res.json()
      if (data.success) alert("✅ All broker verifications completed.")
      else alert(`❌ Some verifications failed:\n${data.errors?.join("\n")}`)
      refresh()
    } catch (err) {
      console.error("[v0] Verify all brokers error:", err)
      alert("❌ Failed to verify brokers. See console.")
    } finally {
      setActionLoading((s) => ({ ...s, verifyAll: false }))
    }
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Emergency Controls */}
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg md:text-xl font-semibold">Connected Brokers</h2>
        <div className="w-64">
          <DashboardEmergency />
        </div>
      </div>

      {hasPlaceholderCredentials && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Alpaca Credentials Required</AlertTitle>
          <AlertDescription>
            Some Alpaca accounts need valid API credentials. Click "Configure" on the broker card to add your API Key and Secret.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2 items-center">
          <Button
            type="button"
            onClick={verifyAllBrokers}
            size={isMobile ? "default" : "sm"}
            variant="outline"
            disabled={actionLoading.verifyAll}
          >
            Verify
          </Button>
          <Button
            type="button"
            onClick={() => setShowAddForm((s) => !s)}
            size={isMobile ? "default" : "sm"}
            className="min-h-[44px]"
            disabled={actionLoading.add}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Broker
          </Button>
        </div>

        <div>
          <Button type="button" onClick={refresh} variant="ghost" className="h-9">
            Refresh
          </Button>
        </div>
      </div>

      {/* Add Broker Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm md:text-base">Add New Broker</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                addBroker({
                  type: String(formData.get("type") || "").toLowerCase(),
                  name: String(formData.get("name") || ""),
                  apiKey: String(formData.get("apiKey") || ""),
                  apiSecret: String(formData.get("apiSecret") || ""),
                  accountId: String(formData.get("accountId") || ""),
                  mode: isLiveMode ? "live" : "paper",
                })
              }}
              className="space-y-3 md:space-y-4"
            >
              <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="type">Broker Type</Label>
                  <Select name="type">
                    <SelectTrigger className="h-11 md:h-10">
                      <SelectValue placeholder="Select broker" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alpaca">Alpaca</SelectItem>
                      <SelectItem value="oanda">Oanda</SelectItem>
                      <SelectItem value="interactivebrokers">Interactive Brokers</SelectItem>
                      <SelectItem value="tdameritrade">TD Ameritrade</SelectItem>
                      <SelectItem value="binance">Binance</SelectItem>
                      <SelectItem value="coinbase">Coinbase</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Account Name</Label>
                  <Input id="name" name="name" placeholder="My Trading Account" className="h-11 md:h-10" />
                </div>

                <div className="space-y-2 col-span-full">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label>Trading Mode</Label>
                      <p className="text-xs text-muted-foreground">{isLiveMode ? "Live" : "Paper"}</p>
                    </div>
                    <Switch checked={isLiveMode} onCheckedChange={setIsLiveMode} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key (optional)</Label>
                  <Input id="apiKey" name="apiKey" type="text" className="h-11 md:h-10" placeholder="PK..." />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiSecret">API Secret (optional)</Label>
                  <Input id="apiSecret" name="apiSecret" type="password" className="h-11 md:h-10" placeholder="Enter API secret" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountId">Account ID (optional)</Label>
                  <Input id="accountId" name="accountId" placeholder="Account ID" className="h-11 md:h-10" />
                </div>
              </div>

              <div className="flex flex-col gap-2 md:flex-row">
                <Button type="submit" className="w-full md:w-auto min-h-[44px]" disabled={actionLoading.add}>
                  Add Broker
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)} className="w-full md:w-auto min-h-[44px]">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Broker Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div>Loading brokers…</div>
        ) : (
          brokers.map((broker: any) => {
            const brokerType = String(broker.type || "").toLowerCase()
            const hasPlaceholder =
              brokerType === "alpaca" &&
              (!broker.apiKey || !broker.apiSecret || broker.apiKey === "your-api-key" || broker.apiSecret === "your-api-secret")

            const equity = Number(broker.equity || 0)
            const buyingPower = Number(broker.buyingPower || 0)
            const openPositions = Number(broker.openPositions || 0)
            const todayPL = Number(broker.todayPL || 0)

            return (
              <Card key={broker.id} className={hasPlaceholder ? "border-destructive" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm md:text-base">{broker.name || broker.id}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {broker.type} {broker.mode ? `(${broker.mode})` : ""}
                      </p>
                    </div>
                    <Badge variant={broker.connected ? "default" : "destructive"}>
                      {broker.connected ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                  {hasPlaceholder && (
                    <div className="flex items-start gap-2 mt-2 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>Click "Configure" to add real API credentials</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-xs md:text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Equity:</span>
                      <span className="font-medium">${equity.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Buying Power:</span>
                      <span className="font-medium">${buyingPower.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Open Positions:</span>
                      <span className="font-medium">{openPositions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Today's P/L:</span>
                      <span className={`font-medium ${todayPL >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {todayPL >= 0 ? "+" : ""}${todayPL.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      size={isMobile ? "default" : "sm"}
                      variant="destructive"
                      className="flex-1 min-h-[44px]"
                      onClick={() => stopBroker(broker.id)}
                      disabled={!!actionLoading[`stop-${broker.id}`]}
                    >
                      <Square className="mr-2 h-3 w-3" />
                      Stop
                    </Button>

                    <Dialog open={configuringBroker?.id === broker.id} onOpenChange={(open) => !open && setConfiguringBroker(null)}>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          size={isMobile ? "default" : "sm"}
                          variant={hasPlaceholder ? "default" : "outline"}
                          className={`flex-1 min-h-[44px] ${!hasPlaceholder ? "bg-transparent" : ""}`}
                          onClick={() => {
                            setConfiguringBroker(broker)
                            setConfigApiKey(broker.apiKey || "")
                            setConfigApiSecret(broker.apiSecret || "")
                          }}
                        >
                          <Settings className="mr-2 h-3 w-3" />
                          Configure
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Configure {broker.name}</DialogTitle>
                          <DialogDescription>
                            Update API credentials for this broker account.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>API Key</Label>
                            <Input value={configApiKey} onChange={(e) => setConfigApiKey(e.target.value)} placeholder="PK..." className="h-11" />
                          </div>
                          <div className="space-y-2">
                            <Label>API Secret</Label>
                            <Input value={configApiSecret} onChange={(e) => setConfigApiSecret(e.target.value)} placeholder="Enter new API secret" type="password" className="h-11" />
                          </div>
                          <Button type="button" onClick={updateBrokerConfig} className="w-full min-h-[44px]" disabled={!!actionLoading[`cfg-${broker.id}`]}>
                            Update Credentials
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      type="button"
                      size={isMobile ? "default" : "sm"}
                      variant="outline"
                      onClick={() => removeBroker(broker.id)}
                      className="min-h-[44px] min-w-[44px]"
                      disabled={!!actionLoading[broker.id]}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
