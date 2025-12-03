interface PersistedState {
  brokers: any[]
  strategies: any[]
  settings: any
  version: number
}

const STORAGE_KEY = "ai-trading-bot-state"
const VERSION = 1

export function saveState(state: Partial<PersistedState>): void {
  try {
    const existing = loadState()
    const merged = { ...existing, ...state, version: VERSION }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    console.log("[v0] Persistence: State saved", merged)
  } catch (error) {
    console.error("[v0] Persistence: Failed to save state", error)
  }
}

export function loadState(): PersistedState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return { brokers: [], strategies: [], settings: {}, version: VERSION }
    }
    const parsed = JSON.parse(stored)
    console.log("[v0] Persistence: State loaded", parsed)
    return parsed
  } catch (error) {
    console.error("[v0] Persistence: Failed to load state", error)
    return { brokers: [], strategies: [], settings: {}, version: VERSION }
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    console.log("[v0] Persistence: State cleared")
  } catch (error) {
    console.error("[v0] Persistence: Failed to clear state", error)
  }
}
