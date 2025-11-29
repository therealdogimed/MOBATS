"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Trash2, RefreshCw } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

export function LogsViewer() {
  const [logs, setLogs] = useState<any[]>([])
  const [filter, setFilter] = useState<"all" | "info" | "warn" | "error" | "critical">("all")
  const isMobile = useIsMobile()

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 2000)
    return () => clearInterval(interval)
  }, [filter])

  const fetchLogs = async () => {
    try {
      const params = filter !== "all" ? `?level=${filter}` : ""
      const response = await fetch(`/api/logs${params}`)
      const data = await response.json()
      setLogs(data.logs || [])
    } catch (err) {
      console.error("[v0] Fetch logs error:", err)
    }
  }

  const clearLogs = async () => {
    try {
      await fetch("/api/logs", { method: "DELETE" })
      setLogs([])
    } catch (err) {
      console.error("[v0] Clear logs error:", err)
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "critical":
        return "destructive"
      case "error":
        return "destructive"
      case "warn":
        return "secondary"
      case "info":
        return "default"
      default:
        return "outline"
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-sm md:text-base">System Logs</CardTitle>
          <div className="flex gap-2">
            <Button
              size={isMobile ? "default" : "sm"}
              variant="outline"
              onClick={fetchLogs}
              className="flex-1 md:flex-none min-h-[44px] bg-transparent"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              size={isMobile ? "default" : "sm"}
              variant="outline"
              onClick={clearLogs}
              className="flex-1 md:flex-none min-h-[44px] bg-transparent"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          {["all", "info", "warn", "error", "critical"].map((level) => (
            <Button
              key={level}
              size={isMobile ? "default" : "sm"}
              variant={filter === level ? "default" : "outline"}
              onClick={() => setFilter(level as any)}
              className="flex-1 md:flex-none min-h-[44px] min-w-[70px]"
            >
              {level}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] md:h-[500px]">
          <div className="space-y-2">
            {logs.length === 0 ? (
              <p className="text-xs md:text-sm text-muted-foreground text-center py-8">No logs to display</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="rounded-lg border p-3 text-xs md:text-sm space-y-1">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getLevelColor(log.level)} className="text-[10px] md:text-xs">
                        {log.level}
                      </Badge>
                      <span className="text-[10px] md:text-xs font-mono text-muted-foreground">{log.component}</span>
                    </div>
                    <span className="text-[10px] md:text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="font-medium text-xs md:text-sm">{log.message}</p>
                  {log.error && (
                    <pre className="text-[10px] md:text-xs bg-muted p-2 rounded overflow-auto">
                      {JSON.stringify(log.error, null, 2)}
                    </pre>
                  )}
                  {log.context && (
                    <div className="text-[10px] md:text-xs text-muted-foreground">
                      Context: {JSON.stringify(log.context)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
