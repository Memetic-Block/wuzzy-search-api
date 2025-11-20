import { Controller, Get, Headers, Logger, Query } from '@nestjs/common'
import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'
import { AppService } from './app.service'
import { SearchResults } from './schema/response.dto'
import { SearchQueryDto } from './schema/search-query.dto'
import { SearchHeadersDto } from './schema/search-headers.dto'

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
    @Query() queryDto: SearchQueryDto,
    @Headers() headers: SearchHeadersDto
  ): Promise<SearchResults> {
    let client_id: string | undefined
    
    const clientName = headers['x-client-name']
    const clientVersion = headers['x-client-version']
    const sessionId = headers['x-session-id']
    let walletAddress = headers['x-wallet-address']
    
    if (clientName || clientVersion || sessionId) {
      client_id = `${clientName || ''}@${clientVersion || ''}@${sessionId || ''}`
    } else {
      this.logger.warn('No client tracking headers provided (x-client-name, x-client-version, x-session-id)')
    }

    // Manually validate wallet address if provided, since header validation might be skipped
    if (walletAddress) {
      const headerInstance = plainToInstance(SearchHeadersDto, { 'x-wallet-address': walletAddress })
      const errors = await validate(headerInstance, { skipMissingProperties: true })
      
      if (errors.length > 0) {
        this.logger.warn(`Invalid x-wallet-address header: ${walletAddress}. Must be 43 characters of base64url. Ignoring wallet address.`)
        walletAddress = undefined
      }
    }

    return this.appService.getSearch(queryDto.q, queryDto.from, client_id, walletAddress)
  }
}
