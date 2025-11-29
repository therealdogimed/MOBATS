export interface ErrorLog {
  timestamp: string
  level: "info" | "warn" | "error" | "critical"
  component: string
  message: string
  error?: any
  context?: Record<string, any>
}

class ErrorHandler {
  private logs: ErrorLog[] = []
  private readonly MAX_LOGS = 1000
  private errorCounts: Map<string, number> = new Map()
  private lastErrorTime: Map<string, number> = new Map()
  private readonly ERROR_THRESHOLD = 5
  private readonly ERROR_WINDOW = 60000 // 1 minute

  log(level: ErrorLog["level"], component: string, message: string, error?: any, context?: Record<string, any>): void {
    const log: ErrorLog = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      error: error ? this.serializeError(error) : undefined,
      context,
    }

    this.logs.push(log)

    // Keep only last N logs
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift()
    }

    // Console output with proper formatting
    const prefix = `[v0:${component}]`
    if (level === "error" || level === "critical") {
      console.error(prefix, message, error || "")
    } else if (level === "warn") {
      console.warn(prefix, message)
    } else {
      console.log(prefix, message)
    }

    // Track error frequency
    if (level === "error" || level === "critical") {
      this.trackError(component)
    }
  }

  private serializeError(error: any): any {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    }
    return error
  }

  private trackError(component: string): void {
    const now = Date.now()
    const lastTime = this.lastErrorTime.get(component) || 0

    // Reset counter if outside error window
    if (now - lastTime > this.ERROR_WINDOW) {
      this.errorCounts.set(component, 0)
    }

    const count = (this.errorCounts.get(component) || 0) + 1
    this.errorCounts.set(component, count)
    this.lastErrorTime.set(component, now)

    // Critical threshold reached
    if (count >= this.ERROR_THRESHOLD) {
      this.log("critical", "ErrorHandler", `Component ${component} has exceeded error threshold`, null, {
        errorCount: count,
        window: this.ERROR_WINDOW,
      })
    }
  }

  getLogs(filter?: { level?: ErrorLog["level"]; component?: string }): ErrorLog[] {
    if (!filter) return [...this.logs]

    return this.logs.filter((log) => {
      if (filter.level && log.level !== filter.level) return false
      if (filter.component && log.component !== filter.component) return false
      return true
    })
  }

  clearLogs(): void {
    this.logs = []
    this.errorCounts.clear()
    this.lastErrorTime.clear()
  }

  getErrorCount(component: string): number {
    return this.errorCounts.get(component) || 0
  }
}

let errorHandlerInstance: ErrorHandler | null = null

export function getErrorHandler(): ErrorHandler {
  if (!errorHandlerInstance) {
    errorHandlerInstance = new ErrorHandler()
  }
  return errorHandlerInstance
}
