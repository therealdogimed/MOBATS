import { getBotState } from "./bot-state"

export function generateTerminalOutput(): string {
  const state = getBotState()

  const totalEquity = state.brokers.reduce((sum, b) => sum + b.equity, 0)
  const totalPL = state.brokers.reduce((sum, b) => sum + b.pl, 0)

  const lines: string[] = []

  lines.push("╔════════════════════════════════════════╗")
  lines.push("║        AI TRADING BOT v2.0             ║")
  lines.push("╚════════════════════════════════════════╝")
  lines.push("")
  lines.push(`TIMESTAMP: ${new Date().toISOString()}`)
  lines.push(`TOTAL EQUITY: $${totalEquity.toFixed(2)}`)
  lines.push(`TOTAL P/L: ${totalPL >= 0 ? "+" : ""}$${totalPL.toFixed(2)}`)
  lines.push("")
  lines.push("┌─ BROKERS ─────────────────────────────┐")

  state.brokers.forEach((broker) => {
    lines.push(`│ ${broker.name.padEnd(20)} ${broker.connected ? "✓" : "✗"}`)
    lines.push(`│   Equity: $${broker.equity.toFixed(2).padStart(12)}`)
    lines.push(`│   P/L:    ${(broker.pl >= 0 ? "+" : "") + "$" + broker.pl.toFixed(2).padStart(12)}`)
    lines.push(`│`)
  })

  lines.push("└───────────────────────────────────────┘")
  lines.push("")
  lines.push("┌─ STRATEGIES ──────────────────────────┐")

  state.strategies.forEach((strategy) => {
    lines.push(`│ ${strategy.name.padEnd(30)} ${strategy.running ? "RUN" : "STP"}`)
    lines.push(
      `│   Alloc: ${strategy.allocation}%  P/L: ${strategy.plTotal >= 0 ? "+" : ""}$${strategy.plTotal.toFixed(2)}`,
    )
    lines.push(`│   Win Rate: ${strategy.winRate.toFixed(1)}%`)
    lines.push(`│`)
  })

  lines.push("└───────────────────────────────────────┘")
  lines.push("")

  if (state.transactions.length > 0) {
    lines.push("┌─ RECENT TRANSACTIONS ─────────────────┐")
    state.transactions.slice(-5).forEach((tx) => {
      const time = new Date(tx.timestamp).toLocaleTimeString()
      lines.push(`│ ${time} ${tx.type.padEnd(4)} ${tx.symbol.padEnd(6)} ${tx.qty}@${tx.price}`)
    })
    lines.push("└───────────────────────────────────────┘")
  }

  lines.push("")
  lines.push("STATUS: OPERATIONAL")
  lines.push("")

  while (lines.length < 40) {
    lines.push("")
  }

  return lines.slice(0, 40).join("\n")
}
