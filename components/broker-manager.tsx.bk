"use client"

import { useState, useEffect } from "react"
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

export function BrokerManager() {
  const [brokers, setBrokers] = useState<any[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [configuringBroker, setConfiguringBroker] = useState<any>(null)
  const [configApiKey, setConfigApiKey] = useState("")
  const [configApiSecret, setConfigApiSecret] = useState("")
  const [isLiveMode, setIsLiveMode] = useState(false)
  const isMobile = useIsMobile()

  const hasPlaceholderCredentials = brokers.some(
    (b) =>
      b.type.toLowerCase() === "alpaca" &&
      (!b.apiKey || !b.apiSecret || b.apiKey === "your-api-key" || b.apiSecret === "your-api-secret"),
  )

  useEffect(() => {
    const fetchBrokers = async () => {
      try {
        const response = await fetch("/api/brokers")
        const data = await response.json()
        setBrokers(data.brokers)
      } catch (err) {
        console.error("[v0] Fetch brokers error:", err)
      }
    }

    fetchBrokers()
    const interval = setInterval(fetchBrokers, 5000)
    return () => clearInterval(interval)
  }, [])

  const addBroker = async (formData: any) => {
    try {
      await fetch("/api/brokers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      setShowAddForm(false)
    } catch (err) {
      console.error("[v0] Add broker error:", err)
    }
  }

  const removeBroker = async (id: string) => {
    try {
      await fetch(`/api/brokers/${id}`, { method: "DELETE" })
    } catch (err) {
      console.error("[v0] Remove broker error:", err)
    }
  }

  const updateBrokerConfig = async () => {
    if (!configuringBroker) return

    try {
      await fetch(`/api/brokers/${configuringBroker.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: configApiKey,
          apiSecret: configApiSecret,
        }),
      })
      setConfiguringBroker(null)
      setConfigApiKey("")
      setConfigApiSecret("")
      alert("✅ Credentials updated! The system will verify the connection automatically.")
    } catch (err) {
      console.error("[v0] Update broker config error:", err)
      alert("❌ Failed to update credentials. Please try again.")
    }
  }

  const stopBroker = async (brokerId: string) => {
    try {
      await fetch(`/api/brokers/${brokerId}/stop`, {
        method: "POST",
      })
      console.log(`[v0] BrokerManager: Stopped broker ${brokerId}`)
      alert("✅ Broker stopped successfully")
    } catch (err) {
      console.error("[v0] Stop broker error:", err)
      alert("❌ Failed to stop broker")
    }
  }

  const verifyAlpacaConnection = async () => {
    try {
      const response = await fetch("/api/brokers/alpaca/verify")
      const data = await response.json()

      if (data.success) {
        alert(
          `✅ Alpaca Connected!\n\nMode: ${data.mode.toUpperCase()}\nAccount: ${data.account.account_number}\nStatus: ${data.account.status}\nEquity: $${Number(data.account.equity).toLocaleString()}\nBuying Power: $${Number(data.account.buying_power).toLocaleString()}`,
        )
      } else {
        alert(`❌ Alpaca Connection Failed\n\n${data.error}`)
      }
    } catch (error) {
      console.error("[v0] Verify Alpaca error:", error)
      alert("❌ Failed to verify Alpaca connection. Check console for details.")
    }
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {hasPlaceholderCredentials && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Alpaca Credentials Required</AlertTitle>
          <AlertDescription>
            You need to configure valid Alpaca API credentials. Click "Configure" on your Alpaca broker card below to
            add your API Key and Secret.
            <br />
            <br />
            Get your credentials from:{" "}
            <a
              href="https://app.alpaca.markets/paper/dashboard/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              Alpaca Paper Trading Dashboard
            </a>{" "}
            or{" "}
            <a
              href="https://app.alpaca.markets/brokerage/dashboard/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              Alpaca Live Trading Dashboard
            </a>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg md:text-xl font-semibold">Connected Brokers</h2>
        <div className="flex gap-2">
          <Button
            onClick={verifyAlpacaConnection}
            size={isMobile ? "default" : "sm"}
            variant="outline"
            className="flex-1 md:flex-none min-h-[44px] bg-transparent"
          >
            Verify Alpaca
          </Button>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            size={isMobile ? "default" : "sm"}
            className="flex-1 md:flex-none min-h-[44px]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Broker
          </Button>
        </div>
      </div>

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
                  type: formData.get("type"),
                  name: formData.get("name"),
                  apiKey: formData.get("apiKey"),
                  apiSecret: formData.get("apiSecret"),
                  accountId: formData.get("accountId"),
                  mode: isLiveMode ? "live" : "paper",
                })
              }}
              className="space-y-3 md:space-y-4"
            >
              <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="type">Broker Type</Label>
                  <Select name="type" required>
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
                  <Input id="name" name="name" placeholder="My Trading Account" required className="h-11 md:h-10" />
                </div>

                <div className="space-y-2 col-span-full">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label>Alpaca Trading Mode</Label>
                      <p className="text-xs text-muted-foreground">
                        {isLiveMode ? "Live Trading (Real Money)" : "Paper Trading (Simulated)"}
                      </p>
                    </div>
                    <Switch checked={isLiveMode} onCheckedChange={setIsLiveMode} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input id="apiKey" name="apiKey" type="text" required className="h-11 md:h-10" placeholder="PK..." />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiSecret">API Secret</Label>
                  <Input
                    id="apiSecret"
                    name="apiSecret"
                    type="password"
                    required
                    className="h-11 md:h-10"
                    placeholder="Enter API secret"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountId">Account ID (optional)</Label>
                  <Input id="accountId" name="accountId" placeholder="Account ID" className="h-11 md:h-10" />
                </div>
              </div>

              <div className="flex flex-col gap-2 md:flex-row">
                <Button type="submit" className="w-full md:w-auto min-h-[44px]">
                  Add Broker
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                  className="w-full md:w-auto min-h-[44px]"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {brokers.map((broker) => {
          const hasPlaceholder =
            broker.type.toLowerCase() === "alpaca" &&
            (!broker.apiKey ||
              !broker.apiSecret ||
              broker.apiKey === "your-api-key" ||
              broker.apiSecret === "your-api-secret")

          return (
            <Card key={broker.id} className={hasPlaceholder ? "border-destructive" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm md:text-base">{broker.name}</CardTitle>
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
                    <span className="font-medium">${broker.equity.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Buying Power:</span>
                    <span className="font-medium">${broker.buyingPower.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Open Positions:</span>
                    <span className="font-medium">{broker.openPositions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Today's P/L:</span>
                    <span className={`font-medium ${broker.todayPL >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {broker.todayPL >= 0 ? "+" : ""}${broker.todayPL.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size={isMobile ? "default" : "sm"}
                    variant="destructive"
                    className="flex-1 min-h-[44px]"
                    onClick={() => stopBroker(broker.id)}
                  >
                    <Square className="mr-2 h-3 w-3" />
                    Stop
                  </Button>
                  <Dialog
                    open={configuringBroker?.id === broker.id}
                    onOpenChange={(open) => !open && setConfiguringBroker(null)}
                  >
                    <DialogTrigger asChild>
                      <Button
                        size={isMobile ? "default" : "sm"}
                        variant={hasPlaceholder ? "default" : "outline"}
                        className={`flex-1 min-h-[44px] ${!hasPlaceholder && "bg-transparent"}`}
                        onClick={() => setConfiguringBroker(broker)}
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
                          <br />
                          <br />
                          Get your Alpaca API keys from:{" "}
                          <a
                            href={
                              broker.mode === "live"
                                ? "https://app.alpaca.markets/brokerage/dashboard/overview"
                                : "https://app.alpaca.markets/paper/dashboard/overview"
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-primary"
                          >
                            Alpaca Dashboard
                          </a>
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="config-api-key">API Key</Label>
                          <Input
                            id="config-api-key"
                            type="text"
                            value={configApiKey}
                            onChange={(e) => setConfigApiKey(e.target.value)}
                            placeholder="PK..."
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="config-api-secret">API Secret</Label>
                          <Input
                            id="config-api-secret"
                            type="password"
                            value={configApiSecret}
                            onChange={(e) => setConfigApiSecret(e.target.value)}
                            placeholder="Enter new API secret"
                            className="h-11"
                          />
                        </div>
                        <Button onClick={updateBrokerConfig} className="w-full min-h-[44px]">
                          Update Credentials
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    size={isMobile ? "default" : "sm"}
                    variant="outline"
                    onClick={() => removeBroker(broker.id)}
                    className="min-h-[44px] min-w-[44px]"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
