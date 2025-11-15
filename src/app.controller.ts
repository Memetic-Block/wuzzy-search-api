import { Controller, Get, Logger, Query, Headers } from '@nestjs/common'
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
    @Headers('user-agent') userAgent?: string
  ): Promise<SearchResults> {
    return this.appService.getSearch(query, from, userAgent)
  }
}
