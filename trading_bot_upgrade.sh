#!/usr/bin/env bash
# trading_bot_upgrade.sh
# Robust Trading Bot Multi-Broker Upgrade Script
# Usage: chmod +x trading_bot_upgrade.sh && ./trading_bot_upgrade.sh

set -euo pipefail
IFS=$'\n\t'

# -------------------------
# Configuration / Globals
# -------------------------
BACKUP_DIR=".backup"
LOGFILE="${BACKUP_DIR}/upgrade-$(date +%Y%m%d-%H%M%S).log"
VERBOSE=true

# Helper for logging
log() {
  local level="$1"; shift
  local msg="$*"
  local ts
  ts="$(date --iso-8601=seconds 2>/dev/null || date)"
  echo "[$ts] [$level] $msg" | tee -a "$LOGFILE"
}

# Trap for unexpected errors
trap 'log "ERROR" "Upgrade aborted at line $LINENO"; exit 1' ERR
trap 'log "INFO" "Finished (exit status $?)"' EXIT

# -------------------------
# Safety helpers
# -------------------------
ensure_dir() {
  local dir="$1"
  if [ -z "$dir" ]; then
    log "ERROR" "ensure_dir called with empty dir"
    return 1
  fi

  if [ -d "$dir" ]; then
    : # exists
  else
    log "INFO" "Directory '$dir' does not exist — creating..."
    if ! mkdir -p "$dir" 2>/dev/null; then
      log "ERROR" "Cannot create directory '$dir'. Check parent dir perms."
      log "HINT" "Try: sudo mkdir -p '$dir' && sudo chown -R \$USER:$(id -gn) '$dir'"
      exit 1
    fi
  fi

  if [ ! -w "$dir" ]; then
    log "ERROR" "No write permission in directory '$dir'"
    log "HINT" "Run: sudo chmod -R 755 '$dir' or change owner: sudo chown -R \$USER:$(id -gn) '$dir'"
    exit 1
  fi
}

ensure_file_path() {
  local file="$1"
  if [ -z "$file" ]; then
    log "ERROR" "ensure_file_path called with empty file"
    return 1
  fi
  local dir
  dir=$(dirname "$file")
  ensure_dir "$dir"
}

# Safer file write using heredoc to destination path
write_file() {
  local path="$1"
  ensure_file_path "$path"
  # Use cat to write the piped content to the path
  # caller should do: write_file "dest" <<'EOF' ... EOF
  cat > "$path"
  log "INFO" "Wrote file: $path"
}

# Backup function: create tar of targets if they exist
create_backup() {
  ensure_dir "$BACKUP_DIR"
  log "INFO" "Creating backup..."
  local timestamp
  timestamp="$(date +%Y%m%d-%H%M%S)"
  local archive="${BACKUP_DIR}/backup-${timestamp}.tar.gz"
  # Collect only existing paths
  local -a to_backup=(lib components app package.json package-lock.json)
  local -a existing=()
  for p in "${to_backup[@]}"; do
    if [ -e "$p" ]; then
      existing+=("$p")
    fi
  done

  if [ ${#existing[@]} -eq 0 ]; then
    log "INFO" "No existing project files found to back up."
    touch "$archive"
    log "INFO" "Created empty backup stub: $archive"
    return 0
  fi

  tar -czf "$archive" "${existing[@]}" 2>/dev/null || {
    log "WARN" "tar compression failed; attempting plain tar..."
    tar -cf "${archive%.gz}.tar" "${existing[@]}"
  }

  log "INFO" "Backup created: $archive"
}

# Quick check: make file executable if script
make_executable() {
  local file="$1"
  if [ -f "$file" ] && [[ "$file" == *.sh || "$file" == *.bin ]]; then
    chmod +x "$file" || log "WARN" "Failed to chmod +x $file"
    log "INFO" "Made executable: $file"
  fi
}

# Set sane perms for text files
set_sane_perms() {
  local file="$1"
  if [ -f "$file" ]; then
    chmod 644 "$file" || log "WARN" "Failed to chmod 644 $file"
  fi
}

# -------------------------
# Environment checks
# -------------------------
log "INFO" "Starting Trading Bot Upgrade..."

ensure_dir "$BACKUP_DIR"
touch "$LOGFILE" || { echo "Cannot write log $LOGFILE"; exit 1; }

create_backup

# Check node / npm / tsc
NODE_OK=true
if command -v node >/dev/null 2>&1; then
  log "INFO" "node found: $(node --version 2>/dev/null || echo 'unknown')"
else
  log "WARN" "node not found. Many operations may require node. Install from https://nodejs.org/"
  NODE_OK=false
fi

if command -v npm >/dev/null 2>&1; then
  log "INFO" "npm found: $(npm --version 2>/dev/null || echo 'unknown')"
else
  log "WARN" "npm not found. If your project needs npm dependencies, install npm."
fi

if command -v tsc >/dev/null 2>&1; then
  log "INFO" "tsc found: $(tsc --version 2>/dev/null || echo 'unknown')"
else
  log "INFO" "TypeScript compiler (tsc) not found — TypeScript checks will be skipped."
fi

# -------------------------
# Create directories + files
# -------------------------
log "INFO" "Creating source tree and files..."

# Ensure base directories
ensure_dir "lib/brokers"
ensure_dir "app/api/emergency"
ensure_dir "components"

# -------------------------
# Write files (full contents)
# -------------------------

# lib/brokers/base-broker.ts
write_file "lib/brokers/base-broker.ts" <<'EOF'
export interface BrokerConfig {
  id: string
  name: string
  type: string
  apiKey: string
  apiSecret: string
  mode?: 'paper' | 'live'
  apiEndpoint?: string
  additionalConfig?: Record<string, any>
}

export interface Position {
  symbol: string
  qty: number
  side: 'long' | 'short'
  entryPrice: number
  currentPrice: number
  unrealizedPL: number
  unrealizedPLPercent: number
}

export interface Account {
  equity: number
  buyingPower: number
  cash: number
  marginUsed?: number
  status: string
}

export interface Order {
  symbol: string
  qty: number
  side: 'buy' | 'sell'
  type: 'market' | 'limit' | 'stop' | 'stop_limit'
  timeInForce: 'day' | 'gtc' | 'ioc' | 'fok'
  limitPrice?: number
  stopPrice?: number
}

export interface OrderResult {
  id: string
  status: string
  symbol: string
  qty: number
  side: string
  filledQty?: number
  avgFillPrice?: number
}

export abstract class BaseBroker {
  protected config: BrokerConfig
  protected isConfigured: boolean = false

  constructor(config: BrokerConfig) {
    this.config = config
    this.isConfigured = !!(config.apiKey && config.apiSecret)
  }

  abstract verifyConnection(): Promise<{ success: boolean; account?: Account; error?: string }>
  abstract getAccount(): Promise<Account>
  abstract getPositions(): Promise<Position[]>
  abstract getMarketPrice(symbol: string): Promise<number>
  abstract placeOrder(order: Order): Promise<OrderResult>
  abstract cancelOrder(orderId: string): Promise<void>
  abstract cancelAllOrders(): Promise<void>
  abstract closePosition(symbol: string): Promise<void>
  abstract closeAllPositions(): Promise<void>
  abstract isMarketOpen(): Promise<boolean>

  getConfig(): BrokerConfig {
    return { ...this.config }
  }

  isReady(): boolean {
    return this.isConfigured
  }
}
EOF
set_sane_perms "lib/brokers/base-broker.ts"

# lib/brokers/alpaca-broker.ts
write_file "lib/brokers/alpaca-broker.ts" <<'EOF'
import { BaseBroker, type BrokerConfig, type Account, type Position, type Order, type OrderResult } from './base-broker'

interface AlpacaAccount {
  account_number: string
  status: string
  equity: string
  buying_power: string
  cash: string
  portfolio_value: string
  pattern_day_trader: boolean
  trading_blocked: boolean
}

interface AlpacaPosition {
  symbol: string
  qty: string
  side: string
  market_value: string
  avg_entry_price: string
  current_price: string
  unrealized_pl: string
  unrealized_plpc: string
}

export class AlpacaBroker extends BaseBroker {
  private baseUrl: string
  private dataUrl: string = 'https://data.alpaca.markets'

  constructor(config: BrokerConfig) {
    super(config)
    this.baseUrl = config.mode === 'live' 
      ? 'https://api.alpaca.markets'
      : 'https://paper-api.alpaca.markets'
  }

  private getHeaders(): HeadersInit {
    return {
      'APCA-API-KEY-ID': this.config.apiKey,
      'APCA-API-SECRET-KEY': this.config.apiSecret,
      'Content-Type': 'application/json'
    }
  }

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: { ...this.getHeaders(), ...options?.headers }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Alpaca API error (${response.status}): ${error}`)
    }

    return response.json()
  }

  async verifyConnection(): Promise<{ success: boolean; account?: Account; error?: string }> {
    try {
      const account = await this.getAccount()
      return { success: true, account }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  async getAccount(): Promise<Account> {
    const data = await this.request<AlpacaAccount>(`${this.baseUrl}/v2/account`)
    return {
      equity: parseFloat(data.equity),
      buyingPower: parseFloat(data.buying_power),
      cash: parseFloat(data.cash),
      status: data.status
    }
  }

  async getPositions(): Promise<Position[]> {
    const data = await this.request<AlpacaPosition[]>(`${this.baseUrl}/v2/positions`)
    return data.map(p => ({
      symbol: p.symbol,
      qty: parseFloat(p.qty),
      side: p.side === 'long' ? 'long' : 'short',
      entryPrice: parseFloat(p.avg_entry_price),
      currentPrice: parseFloat(p.current_price),
      unrealizedPL: parseFloat(p.unrealized_pl),
      unrealizedPLPercent: parseFloat(p.unrealized_plpc) * 100
    }))
  }

  async getMarketPrice(symbol: string): Promise<number> {
    const data = await this.request<any>(`${this.dataUrl}/v2/stocks/${symbol}/quotes/latest?feed=iex`)
    return (data.quote.ap + data.quote.bp) / 2
  }

  async placeOrder(order: Order): Promise<OrderResult> {
    const result = await this.request<any>(`${this.baseUrl}/v2/orders`, {
      method: 'POST',
      body: JSON.stringify({
        symbol: order.symbol,
        qty: order.qty.toString(),
        side: order.side,
        type: order.type,
        time_in_force: order.timeInForce,
        limit_price: order.limitPrice?.toString(),
        stop_price: order.stopPrice?.toString()
      })
    })

    return {
      id: result.id,
      status: result.status,
      symbol: result.symbol,
      qty: parseFloat(result.qty),
      side: result.side,
      filledQty: result.filled_qty ? parseFloat(result.filled_qty) : undefined,
      avgFillPrice: result.filled_avg_price ? parseFloat(result.filled_avg_price) : undefined
    }
  }

  async cancelOrder(orderId: string): Promise<void> {
    await this.request(`${this.baseUrl}/v2/orders/${orderId}`, { method: 'DELETE' })
  }

  async cancelAllOrders(): Promise<void> {
    await this.request(`${this.baseUrl}/v2/orders`, { method: 'DELETE' })
  }

  async closePosition(symbol: string): Promise<void> {
    await this.request(`${this.baseUrl}/v2/positions/${symbol}`, { method: 'DELETE' })
  }

  async closeAllPositions(): Promise<void> {
    await this.request(`${this.baseUrl}/v2/positions`, { method: 'DELETE' })
  }

  async isMarketOpen(): Promise<boolean> {
    const clock = await this.request<{ is_open: boolean }>(`${this.baseUrl}/v2/clock`)
    return clock.is_open
  }
}
EOF
set_sane_perms "lib/brokers/alpaca-broker.ts"

# lib/brokers/interactive-brokers.ts
write_file "lib/brokers/interactive-brokers.ts" <<'EOF'
import { BaseBroker, type BrokerConfig, type Account, type Position, type Order, type OrderResult } from './base-broker'

export class InteractiveBrokersBroker extends BaseBroker {
  private baseUrl: string

  constructor(config: BrokerConfig) {
    super(config)
    this.baseUrl = config.apiEndpoint || 'https://localhost:5000'
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    })

    if (!response.ok) {
      throw new Error(`IBKR API error: ${response.statusText}`)
    }

    return response.json()
  }

  async verifyConnection(): Promise<{ success: boolean; account?: Account; error?: string }> {
    try {
      const account = await this.getAccount()
      return { success: true, account }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Connection failed' }
    }
  }

  async getAccount(): Promise<Account> {
    const data = await this.request<any>('/v1/api/portfolio/accounts')
    return {
      equity: parseFloat(data.netliquidation?.amount || '0'),
      buyingPower: parseFloat(data.buyingpower?.amount || '0'),
      cash: parseFloat(data.totalcashvalue?.amount || '0'),
      status: 'active'
    }
  }

  async getPositions(): Promise<Position[]> {
    const data = await this.request<any[]>('/v1/api/portfolio/positions')
    return data.map(p => ({
      symbol: p.contractDesc,
      qty: p.position,
      side: p.position > 0 ? 'long' : 'short',
      entryPrice: p.avgCost,
      currentPrice: p.mktPrice,
      unrealizedPL: p.unrealizedPnl,
      unrealizedPLPercent: (p.unrealizedPnl / (p.avgCost * Math.abs(p.position))) * 100
    }))
  }

  async getMarketPrice(symbol: string): Promise<number> {
    const data = await this.request<any>(`/v1/api/md/snapshot?conids=${symbol}`)
    return data[0]?.last || 0
  }

  async placeOrder(order: Order): Promise<OrderResult> {
    const result = await this.request<any>('/v1/api/iserver/account/orders', {
      method: 'POST',
      body: JSON.stringify({
        conid: order.symbol,
        orderType: order.type.toUpperCase(),
        side: order.side.toUpperCase(),
        quantity: order.qty,
        price: order.limitPrice,
        tif: order.timeInForce.toUpperCase()
      })
    })

    return {
      id: result.order_id,
      status: result.order_status,
      symbol: order.symbol,
      qty: order.qty,
      side: order.side
    }
  }

  async cancelOrder(orderId: string): Promise<void> {
    await this.request(`/v1/api/iserver/account/order/${orderId}`, { method: 'DELETE' })
  }

  async cancelAllOrders(): Promise<void> {
    const orders = await this.request<any[]>('/v1/api/iserver/account/orders')
    await Promise.all(orders.map(o => this.cancelOrder(o.orderId)))
  }

  async closePosition(symbol: string): Promise<void> {
    const positions = await this.getPositions()
    const position = positions.find(p => p.symbol === symbol)
    if (position) {
      await this.placeOrder({
        symbol,
        qty: Math.abs(position.qty),
        side: position.side === 'long' ? 'sell' : 'buy',
        type: 'market',
        timeInForce: 'day'
      })
    }
  }

  async closeAllPositions(): Promise<void> {
    const positions = await this.getPositions()
    await Promise.all(positions.map(p => this.closePosition(p.symbol)))
  }

  async isMarketOpen(): Promise<boolean> {
    return true // IBKR handles this internally
  }
}
EOF
set_sane_perms "lib/brokers/interactive-brokers.ts"

# lib/brokers/td-ameritrade.ts
write_file "lib/brokers/td-ameritrade.ts" <<'EOF'
import { BaseBroker, type BrokerConfig, type Account, type Position, type Order, type OrderResult } from './base-broker'

export class TDAmeritradeBroker extends BaseBroker {
  private baseUrl = 'https://api.tdameritrade.com/v1'

  async verifyConnection(): Promise<{ success: boolean; account?: Account; error?: string }> {
    try {
      const account = await this.getAccount()
      return { success: true, account }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Connection failed' }
    }
  }

  async getAccount(): Promise<Account> {
    const response = await fetch(`${this.baseUrl}/accounts`, {
      headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
    })
    const data = await response.json()
    const account = data.securitiesAccount

    return {
      equity: account.currentBalances.liquidationValue,
      buyingPower: account.currentBalances.buyingPower,
      cash: account.currentBalances.cashBalance,
      status: 'active'
    }
  }

  async getPositions(): Promise<Position[]> {
    const response = await fetch(`${this.baseUrl}/accounts?fields=positions`, {
      headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
    })
    const data = await response.json()
    const positions = data.securitiesAccount.positions || []

    return positions.map((p: any) => ({
      symbol: p.instrument.symbol,
      qty: p.longQuantity - p.shortQuantity,
      side: p.longQuantity > 0 ? 'long' : 'short',
      entryPrice: p.averagePrice,
      currentPrice: p.marketValue / (p.longQuantity || p.shortQuantity),
      unrealizedPL: p.marketValue - (p.averagePrice * (p.longQuantity || p.shortQuantity)),
      unrealizedPLPercent: ((p.marketValue / (p.averagePrice * (p.longQuantity || p.shortQuantity))) - 1) * 100
    }))
  }

  async getMarketPrice(symbol: string): Promise<number> {
    const response = await fetch(`${this.baseUrl}/marketdata/${symbol}/quotes`, {
      headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
    })
    const data = await response.json()
    return data[symbol].lastPrice
  }

  async placeOrder(order: Order): Promise<OrderResult> {
    const response = await fetch(`${this.baseUrl}/accounts/${this.config.additionalConfig?.accountId}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderType: order.type.toUpperCase(),
        session: 'NORMAL',
        duration: order.timeInForce.toUpperCase(),
        orderStrategyType: 'SINGLE',
        orderLegCollection: [{
          instruction: order.side.toUpperCase(),
          quantity: order.qty,
          instrument: { symbol: order.symbol, assetType: 'EQUITY' }
        }],
        price: order.limitPrice
      })
    })

    const location = response.headers.get('location')
    const orderId = location?.split('/').pop() || ''

    return {
      id: orderId,
      status: 'ACCEPTED',
      symbol: order.symbol,
      qty: order.qty,
      side: order.side
    }
  }

  async cancelOrder(orderId: string): Promise<void> {
    await fetch(`${this.baseUrl}/accounts/${this.config.additionalConfig?.accountId}/orders/${orderId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
    })
  }

  async cancelAllOrders(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/accounts/${this.config.additionalConfig?.accountId}/orders`, {
      headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
    })
    const orders = await response.json()
    await Promise.all(orders.map((o: any) => this.cancelOrder(o.orderId)))
  }

  async closePosition(symbol: string): Promise<void> {
    const positions = await this.getPositions()
    const position = positions.find(p => p.symbol === symbol)
    if (position) {
      await this.placeOrder({
        symbol,
        qty: Math.abs(position.qty),
        side: position.side === 'long' ? 'sell' : 'buy',
        type: 'market',
        timeInForce: 'day'
      })
    }
  }

  async closeAllPositions(): Promise<void> {
    const positions = await this.getPositions()
    await Promise.all(positions.map(p => this.closePosition(p.symbol)))
  }

  async isMarketOpen(): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/marketdata/hours?markets=EQUITY&date=${new Date().toISOString().split('T')[0]}`, {
      headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
    })
    const data = await response.json()
    return data.equity?.EQ?.isOpen || false
  }
}
EOF
set_sane_perms "lib/brokers/td-ameritrade.ts"

# lib/brokers/broker-factory.ts
write_file "lib/brokers/broker-factory.ts" <<'EOF'
import { BaseBroker, type BrokerConfig } from './base-broker'
import { AlpacaBroker } from './alpaca-broker'
import { InteractiveBrokersBroker } from './interactive-brokers'
import { TDAmeritradeBroker } from './td-ameritrade'

export class BrokerFactory {
  static createBroker(config: BrokerConfig): BaseBroker {
    const type = config.type.toLowerCase()

    switch (type) {
      case 'alpaca':
        return new AlpacaBroker(config)
      case 'interactive brokers':
      case 'interactivebrokers':
      case 'ibkr':
        return new InteractiveBrokersBroker(config)
      case 'td ameritrade':
      case 'tdameritrade':
        return new TDAmeritradeBroker(config)
      default:
        throw new Error(`Unsupported broker type: ${config.type}`)
    }
  }

  static getSupportedBrokers(): string[] {
    return ['Alpaca', 'Interactive Brokers', 'TD Ameritrade']
  }
}
EOF
set_sane_perms "lib/brokers/broker-factory.ts"

# app/api/emergency/route.ts
write_file "app/api/emergency/route.ts" <<'EOF'
import { NextResponse } from 'next/server'
import { getBotState } from '@/lib/bot-state'
import { BrokerFactory } from '@/lib/brokers/broker-factory'
import { getErrorHandler } from '@/lib/error-handler'

export async function POST(request: Request) {
  const logger = getErrorHandler()

  try {
    const { action, brokerId, symbol } = await request.json()

    logger.log('critical', 'EmergencyAPI', `Emergency action: ${action}`, null, { brokerId, symbol })

    const state = getBotState()
    const broker = brokerId ? state.brokers.find(b => b.id === brokerId) : state.brokers[0]

    if (!broker) {
      return NextResponse.json({ error: 'Broker not found' }, { status: 404 })
    }

    const brokerClient = BrokerFactory.createBroker({
      id: broker.id,
      name: broker.name,
      type: broker.type,
      apiKey: broker.apiKey || '',
      apiSecret: broker.apiSecret || '',
      mode: broker.mode
    })

    switch (action) {
      case 'cancel_all_orders':
        await brokerClient.cancelAllOrders()
        logger.log('critical', 'EmergencyAPI', 'Cancelled all orders', null, { brokerId: broker.id })
        break

      case 'close_position':
        if (!symbol) {
          return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
        }
        await brokerClient.closePosition(symbol)
        logger.log('critical', 'EmergencyAPI', `Closed position: ${symbol}`, null, { brokerId: broker.id })
        break

      case 'close_all_positions':
        await brokerClient.closeAllPositions()
        logger.log('critical', 'EmergencyAPI', 'Closed all positions', null, { brokerId: broker.id })
        break

      case 'emergency_stop':
        await brokerClient.cancelAllOrders()
        await brokerClient.closeAllPositions()
        state.strategies.forEach(s => s.running = false)
        logger.log('critical', 'EmergencyAPI', 'Emergency stop executed', null, { brokerId: broker.id })
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: `${action} completed successfully` })
  } catch (error) {
    logger.log('error', 'EmergencyAPI', 'Emergency action failed', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Emergency action failed' 
    }, { status: 500 })
  }
}
EOF
set_sane_perms "app/api/emergency/route.ts"

# components/emergency-controls.tsx
write_file "components/emergency-controls.tsx" <<'EOF'
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Square, XCircle } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

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
                This will immediately cancel all pending orders across all strategies. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => executeEmergency('cancel_all_orders')}>
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
                This will immediately close all open positions at market price. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => executeEmergency('close_all_positions')}>
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
                This will IMMEDIATELY:
                • Cancel all pending orders
                • Close all open positions at market price
                • Stop all running strategies
                
                This is a CRITICAL action and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => executeEmergency('emergency_stop')}
                className="bg-red-700 hover:bg-red-800"
              >
                CONFIRM EMERGENCY STOP
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
EOF
set_sane_perms "components/emergency-controls.tsx"

# components/dashboard-emergency.tsx
write_file "components/dashboard-emergency.tsx" <<'EOF'
"use client"

import { EmergencyControls } from "./emergency-controls"

export function DashboardEmergency() {
  return (
    <div className="space-y-4">
      <EmergencyControls />
    </div>
  )
}
EOF
set_sane_perms "components/dashboard-emergency.tsx"

# -------------------------
# Post-create steps
# -------------------------

# make any .sh scripts executable (none in this drop-in, but keep the function)
make_executable "trading_bot_upgrade.sh"

# Run npm install if package.json present
if [ -f "package.json" ]; then
  if command -v npm >/dev/null 2>&1; then
    log "INFO" "package.json detected — running npm install (no audit)"
    npm install --no-audit --no-fund 2>&1 | tee -a "$LOGFILE" || {
      log "WARN" "npm install failed; you may need to run 'npm install' manually."
    }
  else
    log "WARN" "package.json present but npm is not installed."
  fi
else
  log "INFO" "No package.json found — skipping npm install."
fi

# Run TypeScript check if tsc available
if command -v tsc >/dev/null 2>&1; then
  log "INFO" "Running TypeScript check: tsc --noEmit"
  if ! tsc --noEmit 2>&1 | tee -a "$LOGFILE"; then
    log "WARN" "TypeScript reported issues. Please review the TypeScript errors above."
  else
    log "INFO" "TypeScript check passed."
  fi
else
  log "INFO" "tsc not available — skipped TypeScript static check."
fi

# Quick Node sanity test for imports (only a smoke test)
if [ "$NODE_OK" = true ]; then
  log "INFO" "Running a quick node environment sanity check."
  node -e "console.log('node ok')" 2>&1 | tee -a "$LOGFILE" || log "WARN" "Node quick check failed."
fi

# Final messages and guidance
log "INFO" "✅ Multi-broker support and Emergency controls files created."
log "INFO" "Files written to: lib/, components/, app/api/emergency/"
log "INFO" ""
log "INFO" "📋 Next manual steps (recommended):"
log "INFO" "1) Import EmergencyControls in your Dashboard component"
log "INFO" "2) Update broker-manager.tsx to use BrokerFactory"
log "INFO" "3) Test each broker integration individually with valid API credentials"
log "INFO" ""
log "INFO" "If you have repo-specific lint rules, run them now (e.g. eslint, prettier)."

# End of script (trap will log final status)
exit 0
