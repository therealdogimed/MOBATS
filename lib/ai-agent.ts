import { generateText } from "ai"
import { getPositionTracker } from "./position-tracker"
import { getDataSourceManager } from "./data-sources"
import { getErrorHandler } from "./error-handler"

interface TradingDecision {
  action: "buy" | "sell" | "hold"
  symbol: string
  quantity: number
  reasoning: string
  confidence: number
  signals: string[]
}

export class AIAgent {
  private model: string
  private systemPrompt: string
  private decisionHistory: TradingDecision[] = []
  private readonly logger = getErrorHandler()

  constructor(model = "openai/gpt-4o", customPrompt?: string) {
    this.model = model
    this.systemPrompt = customPrompt || this.getDefaultPrompt()
  }

  private getDefaultPrompt(): string {
    return `You are an expert trading AI managing multiple concurrent strategies. Your responsibilities:

1. MEMORY: Track why each position was opened and which strategy owns it
2. ISOLATION: Never close a position opened by a different strategy
3. SIGNALS: Analyze all available data sources before making decisions
4. RISK: Respect stop losses, take profits, and position sizing limits
5. REASONING: Always explain your decisions clearly

When analyzing trades:
- Check existing positions and their opening context
- Consider signals from all enabled data sources
- Ensure strategy isolation (don't interfere with other strategies' positions)
- Apply appropriate risk management for the strategy type
- Document your reasoning for future reference`
  }

  async analyzeAndDecide(params: {
    strategyId: string
    strategyName: string
    strategyType: "high-volatility" | "medium-volatility"
    symbol: string
    currentPrice: number
    accountBalance: number
    allocation: number
  }): Promise<TradingDecision> {
    const positionTracker = getPositionTracker()
    const dataSourceManager = getDataSourceManager()

    try {
      // Gather context
      const existingPositions = positionTracker.getPositionsByStrategy(params.strategyId)
      const allPositions = positionTracker.getPositionContext(params.symbol)
      const signals = await dataSourceManager.fetchSignals(params.symbol)

      // Check if this strategy already has a position
      const hasPosition = positionTracker.hasPosition(params.symbol, params.strategyId)

      this.logger.log("info", "AIAgent", `Analyzing ${params.symbol} for ${params.strategyName}`, null, {
        hasPosition,
        signalCount: signals.length,
        existingPositions: existingPositions.length,
      })

      const { text } = await generateText({
        model: this.model,
        system: this.systemPrompt,
        prompt: `Analyze this trading opportunity:

Strategy: ${params.strategyName} (${params.strategyType})
Symbol: ${params.symbol}
Current Price: $${params.currentPrice}
Account Balance: $${params.accountBalance}
Strategy Allocation: ${params.allocation}%

Existing Positions for this Strategy:
${existingPositions.map((p) => `- ${p.symbol}: ${p.qty} shares @ $${p.entryPrice} (Reason: ${p.openReason})`).join("\n") || "None"}

All Positions for ${params.symbol}:
${allPositions.map((p) => `- Strategy: ${p.strategyName}, ${p.qty} shares @ $${p.entryPrice} (Reason: ${p.openReason})`).join("\n") || "None"}

Available Signals:
${signals.map((s) => `- ${s.source}: ${s.signal} (strength: ${s.strength}%)`).join("\n") || "No signals available"}

Has Position Already: ${hasPosition}

Decide: BUY, SELL, or HOLD. Format your response as JSON:
{
  "action": "buy|sell|hold",
  "quantity": <number>,
  "reasoning": "<detailed explanation>",
  "confidence": <0-100>,
  "signals_used": ["<source1>", "<source2>"]
}`,
      })

      // Parse AI response
      const decision = this.parseDecision(text, params)

      // Store decision in history
      this.decisionHistory.push(decision)
      if (this.decisionHistory.length > 100) {
        this.decisionHistory.shift()
      }

      this.logger.log("info", "AIAgent", `Decision: ${decision.action} ${decision.symbol}`, null, {
        confidence: decision.confidence,
        reasoning: decision.reasoning,
      })

      return decision
    } catch (error) {
      this.logger.log("error", "AIAgent", `Analysis failed for ${params.symbol}`, error)

      // Safe fallback decision
      return {
        action: "hold",
        symbol: params.symbol,
        quantity: 0,
        reasoning: "Error during analysis - defaulting to HOLD for safety",
        confidence: 0,
        signals: [],
      }
    }
  }

  private parseDecision(text: string, params: any): TradingDecision {
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("No JSON found in response")
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        action: parsed.action || "hold",
        symbol: params.symbol,
        quantity: parsed.quantity || 0,
        reasoning: parsed.reasoning || "No reasoning provided",
        confidence: parsed.confidence || 0,
        signals: parsed.signals_used || [],
      }
    } catch (error) {
      this.logger.log("warn", "AIAgent", "Failed to parse AI response, using safe defaults", error)

      return {
        action: "hold",
        symbol: params.symbol,
        quantity: 0,
        reasoning: "Failed to parse AI response",
        confidence: 0,
        signals: [],
      }
    }
  }

  getDecisionHistory(): TradingDecision[] {
    return [...this.decisionHistory]
  }
}

let aiAgentInstance: AIAgent | null = null

export function getAIAgent(): AIAgent {
  if (!aiAgentInstance) {
    aiAgentInstance = new AIAgent()
  }
  return aiAgentInstance
}
