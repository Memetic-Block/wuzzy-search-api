import { Controller, Get, Query } from '@nestjs/common'
import { AppService } from './app.service'
import { SearchResults } from './schema/interfaces'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHealth(): string {
    return this.appService.getHealth()
  }

  @Get('search')
  async search(
    @Query('q') query: string,
    @Query('from') from: number
  ): Promise<SearchResults> {
    return this.appService.getSearch(query, from)
  }
}
