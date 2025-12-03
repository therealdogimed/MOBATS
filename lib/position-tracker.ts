export interface PositionMetadata {
  positionId: string
  symbol: string
  qty: number
  entryPrice: number
  currentPrice: number
  strategyId: string
  strategyName: string
  openReason: string // AI's reasoning for opening this position
  openTimestamp: string
  signals: string[] // Data sources that triggered this position
  stopLoss?: number
  takeProfit?: number
  unrealizedPL: number
}

export interface ClosedPosition extends PositionMetadata {
  closeTimestamp: string
  closeReason: string
  realizedPL: number
}

class PositionTracker {
  private positions: Map<string, PositionMetadata> = new Map()
  private positionHistory: ClosedPosition[] = []
  private scalpingProfit = 0

  recordPosition(metadata: PositionMetadata): void {
    console.log(`[v0] Recording position: ${metadata.symbol} for strategy ${metadata.strategyName}`)
    this.positions.set(metadata.positionId, metadata)
  }

  updatePosition(positionId: string, updates: Partial<PositionMetadata>): void {
    const position = this.positions.get(positionId)
    if (position) {
      Object.assign(position, updates)
    }
  }

  closePosition(positionId: string, closeReason: string, realizedPL?: number): void {
    const position = this.positions.get(positionId)
    if (position) {
      console.log(`[v0] Closing position ${positionId}: ${closeReason}`)

      const closedPosition: ClosedPosition = {
        ...position,
        closeTimestamp: new Date().toISOString(),
        closeReason,
        realizedPL: realizedPL ?? position.unrealizedPL,
      }

      this.positionHistory.push(closedPosition)

      // Track scalping profits (profit-taking strategy)
      if (closeReason.includes("scalp") || closeReason.includes("profit-taking")) {
        this.scalpingProfit += closedPosition.realizedPL
        console.log(
          `[v0] Scalping profit updated: +$${closedPosition.realizedPL.toFixed(2)}, Total: $${this.scalpingProfit.toFixed(2)}`,
        )
      }

      this.positions.delete(positionId)
    }
  }

  getScalpingProfit(): number {
    return this.scalpingProfit
  }

  getScalpingTradeCount(): number {
    return this.positionHistory.filter(
      (p) => p.closeReason.includes("scalp") || p.closeReason.includes("profit-taking"),
    ).length
  }

  getPositionsByStrategy(strategyId: string): PositionMetadata[] {
    return Array.from(this.positions.values()).filter((p) => p.strategyId === strategyId)
  }

  getPosition(positionId: string): PositionMetadata | undefined {
    return this.positions.get(positionId)
  }

  getAllPositions(): PositionMetadata[] {
    return Array.from(this.positions.values())
  }

  getPositionContext(symbol: string): PositionMetadata[] {
    return Array.from(this.positions.values()).filter((p) => p.symbol === symbol)
  }

  hasPosition(symbol: string, strategyId: string): boolean {
    return Array.from(this.positions.values()).some((p) => p.symbol === symbol && p.strategyId === strategyId)
  }
}

let positionTrackerInstance: PositionTracker | null = null

export function getPositionTracker(): PositionTracker {
  if (!positionTrackerInstance) {
    positionTrackerInstance = new PositionTracker()
  }
  return positionTrackerInstance
}
