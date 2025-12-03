import { BaseBroker, type BrokerConfig, type Account } from './base-broker'
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

  /**
   * Attempts to connect all brokers in a list of configs.
   * Verifies live and paper accounts individually.
   * Skips brokers with missing credentials or connection errors.
   */
  static async createAndVerifyBrokers(configs: BrokerConfig[]): Promise<{ broker: BaseBroker; accounts: Account[] }[]> {
    const results: { broker: BaseBroker; accounts: Account[] }[] = []

    for (const config of configs) {
      try {
        // Skip brokers without at least one key
        if (!config.apiKey && !config.apiSecret) {
          console.warn(`Skipping broker ${config.name}: no API credentials`)
          continue
        }

        const broker = this.createBroker(config)
        const accounts: Account[] = []

        // Verify live account if mode is live or unspecified
        if (!config.mode || config.mode === 'live') {
          try {
            const liveAccount = await broker.getAccount('live')
            accounts.push(liveAccount)
          } catch (err) {
            console.warn(`Live account verification failed for ${config.name}: ${err instanceof Error ? err.message : err}`)
          }
        }

        // Verify paper account if mode is paper or unspecified
        if (!config.mode || config.mode === 'paper') {
          try {
            const paperAccount = await broker.getAccount('paper')
            accounts.push(paperAccount)
          } catch (err) {
            console.warn(`Paper account verification failed for ${config.name}: ${err instanceof Error ? err.message : err}`)
          }
        }

        if (accounts.length > 0) {
          results.push({ broker, accounts })
        } else {
          console.warn(`No accounts verified for broker ${config.name}, skipping`)
        }
      } catch (err) {
        console.error(`Failed to create broker ${config.name}: ${err instanceof Error ? err.message : err}`)
      }
    }

    return results
  }

  static getSupportedBrokers(): string[] {
    return ['Alpaca', 'Interactive Brokers', 'TD Ameritrade']
  }
}
