"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, RefreshCw } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

export function TerminalView() {
  const [terminalData, setTerminalData] = useState("")
  const terminalRef = useRef<HTMLPreElement>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    const fetchTerminalData = async () => {
      try {
        const response = await fetch("/api/terminal")
        const data = await response.json()
        setTerminalData(data.output)
      } catch (err) {
        console.error("[v0] Terminal fetch error:", err)
      }
    }

    fetchTerminalData()
    const interval = setInterval(fetchTerminalData, 1000)
    return () => clearInterval(interval)
  }, [])

  const exportData = async () => {
    try {
      const response = await fetch("/api/export")
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `trading-data-${Date.now()}.json`
      a.click()
    } catch (err) {
      console.error("[v0] Export error:", err)
    }
  }

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg md:text-xl font-semibold">Terminal View</h2>
        <div className="flex gap-2">
          <Button
            size={isMobile ? "default" : "sm"}
            variant="outline"
            className="flex-1 md:flex-none min-h-[44px] bg-transparent"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button size={isMobile ? "default" : "sm"} onClick={exportData} className="flex-1 md:flex-none min-h-[44px]">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs md:text-sm font-mono">40x40 Live Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <pre
            ref={terminalRef}
            className="bg-black text-green-500 p-2 md:p-4 rounded-lg overflow-auto font-mono text-[10px] md:text-xs leading-tight whitespace-pre h-[400px] md:h-[600px]"
          >
            {terminalData}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
