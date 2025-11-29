"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BrokerManager } from "@/components/broker-manager"
import { StrategyManager } from "@/components/strategy-manager"
import { Dashboard } from "@/components/dashboard"
import { TerminalView } from "@/components/terminal-view"
import { SettingsPanel } from "@/components/settings-panel"
import { LogsViewer } from "@/components/logs-viewer"
import { Activity, Moon, Sun } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export default function AITradingBot() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const isMobile = useIsMobile()
  const { theme, setTheme } = useTheme()

  return (
    <div className="min-h-screen bg-background p-2 md:p-4">
      <div className="mx-auto max-w-[2000px] space-y-3 md:space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight md:text-3xl">AI Trading Bot</h1>
            <p className="text-muted-foreground text-xs md:text-sm">Multi-broker autonomous trading system</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="min-h-[44px] min-w-[44px]"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            <Activity className="h-4 w-4 text-green-500 animate-pulse" />
            <span className="text-sm font-medium">Active</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {isMobile ? (
            <div className="overflow-x-auto">
              <TabsList className="inline-flex w-auto min-w-full">
                <TabsTrigger value="dashboard" className="flex-1 min-w-[100px]">
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="brokers" className="flex-1 min-w-[100px]">
                  Brokers
                </TabsTrigger>
                <TabsTrigger value="strategies" className="flex-1 min-w-[110px]">
                  Strategies
                </TabsTrigger>
                <TabsTrigger value="terminal" className="flex-1 min-w-[100px]">
                  Terminal
                </TabsTrigger>
                <TabsTrigger value="logs" className="flex-1 min-w-[80px]">
                  Logs
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex-1 min-w-[100px]">
                  Settings
                </TabsTrigger>
              </TabsList>
            </div>
          ) : (
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="brokers">Brokers</TabsTrigger>
              <TabsTrigger value="strategies">Strategies</TabsTrigger>
              <TabsTrigger value="terminal">Terminal</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="dashboard" className="mt-3 md:mt-4">
            <Dashboard />
          </TabsContent>

          <TabsContent value="brokers" className="mt-3 md:mt-4">
            <BrokerManager />
          </TabsContent>

          <TabsContent value="strategies" className="mt-3 md:mt-4">
            <StrategyManager />
          </TabsContent>

          <TabsContent value="terminal" className="mt-3 md:mt-4">
            <TerminalView />
          </TabsContent>

          <TabsContent value="logs" className="mt-3 md:mt-4">
            <LogsViewer />
          </TabsContent>

          <TabsContent value="settings" className="mt-3 md:mt-4">
            <SettingsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
