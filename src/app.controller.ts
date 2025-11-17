import { Controller, Get, Headers, Logger, Query } from '@nestjs/common'
import { AppService } from './app.service'
import { SearchResults } from './schema/interfaces'

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name)

  constructor(private readonly appService: AppService) {}

  @Get()
  getHealth(): string {
    return this.appService.getHealth()
  }

  @Get('search')
  async search(
    @Query('q') query: string,
    @Query('from') from: number,
    @Headers('x-client-name') clientName?: string,
    @Headers('x-client-version') clientVersion?: string,
    @Headers('x-session-id') sessionId?: string
  ): Promise<SearchResults> {
    let client_id: string | undefined
    
    if (clientName || clientVersion || sessionId) {
      client_id = `${clientName || ''}@${clientVersion || ''}@${sessionId || ''}`
    } else {
      this.logger.warn('No client tracking headers provided (x-client-name, x-client-version, x-session-id)')
    }

    return this.appService.getSearch(query, from, client_id)
  }
}
