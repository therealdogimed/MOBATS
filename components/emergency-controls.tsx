"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Square, XCircle } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"

export function EmergencyControls() {
  const [loading, setLoading] = useState(false)

  const executeEmergency = async (action: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      const result = await response.json()

      if (result.success) {
        alert(`✅ ${result.message}`)
      } else {
        alert(`❌ ${result.error}`)
      }
    } catch (error) {
      alert(`❌ Emergency action failed: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-red-600/50 bg-red-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-500">
          <AlertTriangle className="h-5 w-5" />
          Emergency Controls
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">

        {/* Cancel All Orders */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full" disabled={loading}>
              <XCircle className="mr-2 h-4 w-4" />
              Cancel All Orders
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel All Orders?</AlertDialogTitle>
              <AlertDialogDescription>
                This will cancel all pending orders across all strategies immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => executeEmergency("cancel_all_orders")}>
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Close All Positions */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full" disabled={loading}>
              <Square className="mr-2 h-4 w-4" />
              Close All Positions
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Close All Positions?</AlertDialogTitle>
              <AlertDialogDescription>
                This will close all open positions at market price immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => executeEmergency("close_all_positions")}>
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Emergency Stop */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full bg-red-700 hover:bg-red-800" disabled={loading}>
              <AlertTriangle className="mr-2 h-4 w-4" />
              EMERGENCY STOP
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Execute Emergency Stop?</AlertDialogTitle>
              <AlertDialogDescription>
                This performs ALL emergency actions:
                • Cancel all orders  
                • Close all positions  
                • Stop all strategies  
                This is irreversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-700 hover:bg-red-800"
                onClick={() => executeEmergency("emergency_stop")}
              >
                Confirm Emergency Stop
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </CardContent>
    </Card>
  )
}

// ✅ ADD THIS
export default EmergencyControls
