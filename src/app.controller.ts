import { Controller, Get, Query } from '@nestjs/common'
import { AppService, SearchResults } from './app.service'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHealth(): string {
    return this.appService.getHealth()
  }

  @Get('search')
  async search(@Query('q') query: string): Promise<SearchResults> {
    return this.appService.getSearch(query)
  }
}
