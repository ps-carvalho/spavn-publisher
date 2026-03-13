import type { EmailProvider, EmailOptions, EmailProviderType } from '../types'

/**
 * Console Email Provider
 *
 * Development-only provider that logs emails to the console instead of sending them.
 * Useful for local development and testing without setting up real email.
 *
 * @example
 * ```typescript
 * const provider = new ConsoleEmailProvider({ from: 'test@example.com' })
 * await provider.send({
 *   to: 'user@example.com',
 *   subject: 'Test',
 *   html: '<h1>Hello</h1>',
 * })
 * // Logs: [ConsoleEmail] To: user@example.com, Subject: Test
 * // Logs: [ConsoleEmail] HTML: <h1>Hello</h1>
 * ```
 */
export interface ConsoleProviderConfig {
  type: 'console'
  from: string
}

export class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'Console'
  readonly type: EmailProviderType = 'console'
  private from: string

  constructor(config: ConsoleProviderConfig) {
    this.from = config.from
  }

  async send(options: EmailOptions): Promise<void> {
    const message = options
    console.log('')
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║                    📧 EMAIL (CONSOLE)                      ║')
    console.log('╠════════════════════════════════════════════════════════════╣')
    console.log(`║ From:    ${(message.from || this.from).padEnd(50)}║`)
    console.log(`║ To:      ${message.to.padEnd(50)}║`)
    console.log(`║ Subject: ${message.subject.padEnd(50)}║`)
    console.log('╠════════════════════════════════════════════════════════════╣')
    
    if (message.text) {
      console.log('║ TEXT:')
      const textLines: string[] = message.text.split('\n').slice(0, 10)
      textLines.forEach((line: string) => {
        const truncated = line.substring(0, 55).padEnd(55)
        console.log(`║ ${truncated} ║`)
      })
      if (message.text.split('\n').length > 10) {
        console.log(`║ ... (truncated)${' '.repeat(41)}║`)
      }
      console.log('╠════════════════════════════════════════════════════════════╣')
    }
    
    if (message.html) {
      console.log('║ HTML: (see below)')
      // Extract link from HTML for magic links
      const linkMatch = message.html.match(/href="([^"]+)/)
      if (linkMatch && linkMatch[1]) {
        const fullLink = linkMatch[1]
        // Print full link on multiple lines if needed
        console.log('║ Link:')
        for (let i = 0; i < fullLink.length; i += 56) {
          const chunk = fullLink.substring(i, i + 56).padEnd(56)
          console.log(`║   ${chunk}║`)
        }
      }
      console.log('╚════════════════════════════════════════════════════════════╝')
      console.log('')
    }
  }
}
