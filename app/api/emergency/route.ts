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
