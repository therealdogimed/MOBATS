"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2 } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

export function SettingsPanel() {
  const [settings, setSettings] = useState<any>({})
  const [dataSources, setDataSources] = useState<any[]>([])
  const [newSource, setNewSource] = useState({ name: "", type: "signals", apiKey: "", endpoint: "" })
  const [alpacaApiKey, setAlpacaApiKey] = useState("")
  const [alpacaApiSecret, setAlpacaApiSecret] = useState("")
  const isMobile = useIsMobile()

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [settingsRes, sourcesRes] = await Promise.all([fetch("/api/settings"), fetch("/api/data-sources")])

        const settingsData = await settingsRes.json()
        const sourcesData = await sourcesRes.json()

        setSettings(settingsData)
        setDataSources(sourcesData.sources || [])
      } catch (err) {
        console.error("[v0] Fetch settings error:", err)
      }
    }

    fetchSettings()
    const interval = setInterval(fetchSettings, 5000)
    return () => clearInterval(interval)
  }, [])

  const saveSettings = async () => {
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
    } catch (err) {
      console.error("[v0] Save settings error:", err)
    }
  }

  const saveAlpacaCredentials = async () => {
    if (!alpacaApiKey || !alpacaApiSecret) {
      alert("Please enter both API key and secret")
      return
    }

    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reinitialize_alpaca" }),
      })

      alert("Alpaca credentials updated! The system will now sync with your account.")
      setAlpacaApiKey("")
      setAlpacaApiSecret("")
    } catch (err) {
      console.error("[v0] Save Alpaca credentials error:", err)
      alert("Failed to update Alpaca credentials")
    }
  }

  const addDataSource = async () => {
    try {
      await fetch("/api/data-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `source-${Date.now()}`,
          ...newSource,
          enabled: true,
          errorCount: 0,
        }),
      })
      setNewSource({ name: "", type: "signals", apiKey: "", endpoint: "" })
    } catch (err) {
      console.error("[v0] Add data source error:", err)
    }
  }

  const removeDataSource = async (id: string) => {
    try {
      await fetch(`/api/data-sources/${id}`, { method: "DELETE" })
    } catch (err) {
      console.error("[v0] Remove data source error:", err)
    }
  }

  return (
    <div className="space-y-3 md:space-y-4">
      <h2 className="text-lg md:text-xl font-semibold">Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm md:text-base">Alpaca Broker Credentials</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Configure your Alpaca API credentials for live trading
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4">
          <div className="space-y-2">
            <Label htmlFor="alpacaKey" className="text-xs md:text-sm">
              Alpaca API Key
            </Label>
            <Input
              id="alpacaKey"
              type="password"
              placeholder="Enter Alpaca API Key"
              value={alpacaApiKey}
              onChange={(e) => setAlpacaApiKey(e.target.value)}
              className="h-11 md:h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="alpacaSecret" className="text-xs md:text-sm">
              Alpaca API Secret
            </Label>
            <Input
              id="alpacaSecret"
              type="password"
              placeholder="Enter Alpaca API Secret"
              value={alpacaApiSecret}
              onChange={(e) => setAlpacaApiSecret(e.target.value)}
              className="h-11 md:h-10"
            />
          </div>

          <Button
            onClick={saveAlpacaCredentials}
            className="w-full min-h-[44px]"
            size={isMobile ? "default" : "default"}
          >
            Save Alpaca Credentials
          </Button>

          <div className="rounded-lg border border-yellow-600/30 bg-yellow-950/10 p-3">
            <p className="text-xs md:text-sm font-medium text-yellow-600 mb-1">Environment Variables</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              For production, add ALPACA_API_KEY and ALPACA_API_SECRET to your environment variables instead of entering
              them here.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm md:text-base">Data Sources & Signal APIs</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Configure multiple APIs for market data, news, and trading signals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4">
          <div className="space-y-2 md:space-y-3">
            {dataSources.map((source) => (
              <div key={source.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-xs md:text-sm truncate">{source.name}</p>
                    <Badge variant="secondary" className="text-[10px] md:text-xs">
                      {source.type}
                    </Badge>
                    {source.enabled ? (
                      <Badge variant="default" className="text-[10px] md:text-xs">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] md:text-xs">
                        Disabled
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-1 truncate">
                    Last fetch: {source.lastFetch || "Never"} | Errors: {source.errorCount}
                  </p>
                </div>
                <Button
                  size={isMobile ? "default" : "sm"}
                  variant="ghost"
                  onClick={() => removeDataSource(source.id)}
                  className="min-h-[44px] min-w-[44px] shrink-0 ml-2"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>

          <div className="border-t pt-3 md:pt-4">
            <p className="text-xs md:text-sm font-medium mb-3">Add New Data Source</p>
            <div className="grid gap-3">
              <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    placeholder="TradingView Signals"
                    value={newSource.name}
                    onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                    className="h-11 md:h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <select
                    value={newSource.type}
                    onChange={(e) => setNewSource({ ...newSource, type: e.target.value })}
                    className="flex h-11 md:h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="signals">Trading Signals</option>
                    <option value="news">News Feed</option>
                    <option value="sentiment">Sentiment Analysis</option>
                    <option value="fundamentals">Fundamentals</option>
                    <option value="market">Market Data</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
                <div>
                  <Label className="text-xs">API Key</Label>
                  <Input
                    type="password"
                    placeholder="Enter API key"
                    value={newSource.apiKey}
                    onChange={(e) => setNewSource({ ...newSource, apiKey: e.target.value })}
                    className="h-11 md:h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Endpoint URL</Label>
                  <Input
                    placeholder="https://api.example.com/v1"
                    value={newSource.endpoint}
                    onChange={(e) => setNewSource({ ...newSource, endpoint: e.target.value })}
                    className="h-11 md:h-8"
                  />
                </div>
              </div>
              <Button onClick={addDataSource} size={isMobile ? "default" : "sm"} className="w-full min-h-[44px]">
                <Plus className="mr-2 h-4 w-4" />
                Add Data Source
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm md:text-base">API Keys & Data Sources</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Configure external services for signals and market data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newsApi" className="text-xs md:text-sm">
              News API Key
            </Label>
            <Input
              id="newsApi"
              type="password"
              placeholder="Enter API key"
              value={settings.newsApiKey || ""}
              onChange={(e) => setSettings({ ...settings, newsApiKey: e.target.value })}
              className="h-11 md:h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signalsApi" className="text-xs md:text-sm">
              Trading Signals API
            </Label>
            <Input
              id="signalsApi"
              type="password"
              placeholder="Enter API key"
              value={settings.signalsApiKey || ""}
              onChange={(e) => setSettings({ ...settings, signalsApiKey: e.target.value })}
              className="h-11 md:h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="researchApi" className="text-xs md:text-sm">
              Market Research API
            </Label>
            <Input
              id="researchApi"
              type="password"
              placeholder="Enter API key"
              value={settings.researchApiKey || ""}
              onChange={(e) => setSettings({ ...settings, researchApiKey: e.target.value })}
              className="h-11 md:h-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm md:text-base">AI Configuration</CardTitle>
          <CardDescription className="text-xs md:text-sm">Configure AI model and behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4">
          <div className="space-y-2">
            <Label htmlFor="aiModel" className="text-xs md:text-sm">
              AI Model
            </Label>
            <Input
              id="aiModel"
              placeholder="openai/gpt-4o"
              value={settings.aiModel || "openai/gpt-4o"}
              onChange={(e) => setSettings({ ...settings, aiModel: e.target.value })}
              className="h-11 md:h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aiPrompt" className="text-xs md:text-sm">
              System Prompt
            </Label>
            <Textarea
              id="aiPrompt"
              rows={4}
              placeholder="Custom instructions for AI trading decisions..."
              value={settings.aiPrompt || ""}
              onChange={(e) => setSettings({ ...settings, aiPrompt: e.target.value })}
              className="min-h-[100px]"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs md:text-sm">AI-Powered Risk Management</Label>
              <p className="text-[10px] md:text-xs text-muted-foreground">Let AI adjust risk parameters dynamically</p>
            </div>
            <Switch
              checked={settings.aiRiskManagement || false}
              onCheckedChange={(checked) => setSettings({ ...settings, aiRiskManagement: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm md:text-base">Risk Management</CardTitle>
          <CardDescription className="text-xs md:text-sm">Global risk parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4">
          <div className="rounded-lg border border-blue-600/30 bg-blue-950/10 p-3">
            <p className="text-xs md:text-sm font-medium text-blue-600 mb-1">Capital Protection Active</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              The system automatically limits trading to 45% of total equity across all strategies and splits. The
              remaining 55% is reserved for safety and cannot be used for trading positions.
            </p>
          </div>

          <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maxDrawdown" className="text-xs md:text-sm">
                Max Drawdown (%)
              </Label>
              <Input
                id="maxDrawdown"
                type="number"
                value={settings.maxDrawdown || 10}
                onChange={(e) => setSettings({ ...settings, maxDrawdown: Number(e.target.value) })}
                className="h-11 md:h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxDailyLoss" className="text-xs md:text-sm">
                Max Daily Loss ($)
              </Label>
              <Input
                id="maxDailyLoss"
                type="number"
                value={settings.maxDailyLoss || 1000}
                onChange={(e) => setSettings({ ...settings, maxDailyLoss: Number(e.target.value) })}
                className="h-11 md:h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultStopLoss" className="text-xs md:text-sm">
                Default Stop Loss (%)
              </Label>
              <Input
                id="defaultStopLoss"
                type="number"
                step="0.1"
                value={settings.defaultStopLoss || 1}
                onChange={(e) => setSettings({ ...settings, defaultStopLoss: Number(e.target.value) })}
                className="h-11 md:h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultTakeProfit" className="text-xs md:text-sm">
                Default Take Profit (%)
              </Label>
              <Input
                id="defaultTakeProfit"
                type="number"
                step="0.1"
                value={settings.defaultTakeProfit || 2}
                onChange={(e) => setSettings({ ...settings, defaultTakeProfit: Number(e.target.value) })}
                className="h-11 md:h-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={saveSettings} className="w-full min-h-[44px]" size={isMobile ? "default" : "default"}>
        Save Settings
      </Button>
    </div>
  )
}
