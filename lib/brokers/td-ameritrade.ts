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
