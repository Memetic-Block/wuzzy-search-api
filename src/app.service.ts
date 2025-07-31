import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Client } from '@elastic/elasticsearch'
import * as fs from 'fs'

import { IndexedDocument, SearchResults } from './schema/interfaces'

@Injectable()
export class AppService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppService.name)
  private readonly elasticSearchClient: Client
  private readonly searchIndexName: string

  private readonly BODY_MAX_LENGTH = 250

  constructor(
    private readonly config: ConfigService<{
      SEARCH_INDEX_NAME: string
      ES_HOST: string
      ES_USERNAME: string
      ES_PASSWORD: string
      ES_USE_TLS: string
      ES_CERT_PATH: string
    }>
  ) {
    const searchIndexName = this.config.get('SEARCH_INDEX_NAME', { infer: true })
    if (!searchIndexName) {
      throw new Error('SEARCH_INDEX_NAME is not defined in the configuration')
    }
    this.searchIndexName = searchIndexName

    const esHost = this.config.get('ES_HOST', { infer: true })
    if (!esHost) {
      throw new Error('ES_HOST is not defined in the configuration')
    }

    const esUsername = this.config.get('ES_USERNAME', { infer: true })
    if (!esUsername) {
      throw new Error('ES_USERNAME is not defined in the configuration')
    }

    const esPassword = this.config.get('ES_PASSWORD', { infer: true })
    if (!esPassword) {
      throw new Error('ES_PASSWORD is not defined in the configuration')
    }


    let tls: { ca: Buffer, rejectUnauthorized: boolean } | undefined
    if (this.config.get('ES_USE_TLS', { infer: true }) === 'true') {
      const esCertPath = this.config.get('ES_CERT_PATH', { infer: true })
      if (!esCertPath) {
        throw new Error('ES_CERT_PATH is not defined in the configuration')
      }
      this.logger.log(`Reading Elasticsearch CA certificate from [${esCertPath}]`)
      const ca = fs.readFileSync(esCertPath)
      tls = {
        ca,

        // !!! For development purposes, consider setting this to true in prod!
        rejectUnauthorized: false
      }
    }

    this.logger.log(
      `Initializing Elasticsearch client with url [${esHost}] ` +
        `and username [${esUsername}]`
    )
    this.logger.log(`Using search index [${this.searchIndexName}]`)
    this.elasticSearchClient = new Client({
      node: esHost,
      auth: {
        username: esUsername,
        password: esPassword
      },
      tls
    })
  }

  async onApplicationBootstrap() {
    this.logger.log('Application bootstrap started...')
    try {
      this.logger.log('Checking Elasticsearch connection...')
      const isElasticSearchReachable = await this.elasticSearchClient.ping()
      if (!isElasticSearchReachable) {
        throw new Error('Elasticsearch is not reachable!')
      }
      this.logger.log('Elasticsearch is reachable.')
    } catch (error) {
      this.logger.error('Error during application bootstrap:', error)
      throw error
    }
    this.logger.log('Application bootstrap completed successfully.')
  }

  getHealth(): string {
    return 'OK'
  }

  async getSearch(
    query: string,
    from: number = 0
  ): Promise<SearchResults> {
    const size = 100
    this.logger.log(
      `Executing search for query [${query}] ` +
        `at offset [${from}] with size [${size}]`
    )
    const result = await this.elasticSearchClient.search<IndexedDocument>({
      index: this.searchIndexName,
      query: {
        combined_fields: {
          fields: [ 'title', 'meta_description', 'headings', 'body' ],
          query
        }
      },
      from,
      size
    })
    const total_results = typeof result.hits.total === 'number'
      ? result.hits.total
      : result.hits.total?.value || 0
    this.logger.log(
      `Search for query "${query}" took [${result.took}ms] ` +
        `with hits [${result.hits.hits.length}] & total results [${total_results}]`
    )

    return {
      took: result.took,
      total_results,
      hits: result.hits.hits
        .map(hit => {
          if (hit._source) {
            hit._source.body = hit._source.body &&
              hit._source.body.length > this.BODY_MAX_LENGTH
                ? hit._source.body.substring(
                    0,
                    this.BODY_MAX_LENGTH
                  ) + '...'
                : hit._source.body
          }            
          return hit._source
        })
        .filter(hit => !!hit)
    }
  }
}
