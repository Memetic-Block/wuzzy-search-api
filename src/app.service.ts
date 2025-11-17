import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Client } from '@opensearch-project/opensearch'
import * as fs from 'fs'
import { stripHtml } from 'string-strip-html'
import { randomUUID } from 'crypto'

import { SearchResults } from './schema/interfaces'

@Injectable()
export class AppService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppService.name)
  private readonly opensearchClient: Client
  private readonly searchIndexName: string
  private readonly ubiStoreName: string
  private readonly HIGHLIGHT_HTML_TAG = 'strong'

  constructor(
    private readonly config: ConfigService<{
      SEARCH_INDEX_NAME: string
      ES_HOST: string
      ES_USERNAME: string
      ES_PASSWORD: string
      ES_USE_TLS: string
      ES_CERT_PATH: string
      UBI_STORE_NAME: string
    }>
  ) {
    const searchIndexName = this.config.get('SEARCH_INDEX_NAME', { infer: true })
    if (!searchIndexName) {
      throw new Error('SEARCH_INDEX_NAME is not defined in the configuration')
    }
    this.searchIndexName = searchIndexName

    this.ubiStoreName = this.config.get('UBI_STORE_NAME', { infer: true }) ?? '.ubi_queries'

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


    let ssl: { ca: Buffer, rejectUnauthorized: boolean } | undefined
    if (this.config.get('ES_USE_TLS', { infer: true }) === 'true') {
      const esCertPath = this.config.get('ES_CERT_PATH', { infer: true })
      if (!esCertPath) {
        throw new Error('ES_CERT_PATH is not defined in the configuration')
      }
      this.logger.log(`Reading OpenSearch CA certificate from [${esCertPath}]`)
      const ca = fs.readFileSync(esCertPath)
      ssl = {
        ca,

        // !!! For development purposes, consider setting this to true in prod!
        rejectUnauthorized: false
      }
    }

    this.logger.log(
      `Initializing OpenSearch client with url [${esHost}] ` +
        `and username [${esUsername}]`
    )
    this.logger.log(`Using search index [${this.searchIndexName}]`)
    this.opensearchClient = new Client({
      node: esHost,
      auth: {
        username: esUsername,
        password: esPassword
      },
      ssl
    })
  }

  async onApplicationBootstrap() {
    this.logger.log('Application bootstrap started...')
    try {
      this.logger.log('Checking OpenSearch connection...')
      const isOpenSearchReachable = await this.opensearchClient.ping()
      if (!isOpenSearchReachable) {
        throw new Error('OpenSearch is not reachable!')
      }
      this.logger.log('OpenSearch is reachable.')
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
    from: number = 0,
    client_id?: string
  ): Promise<SearchResults> {
    const query_id = randomUUID()
    const size = 20

    this.logger.log(
      `Executing search for query [${query}]`
        + ` at offset [${from}] with size [${size}]`
        + ` and query_id [${query_id}]`
        + (client_id ? ` and client_id [${client_id}]` : '')
    )
    const ubi = {
      object_id_field: 'id',
      query_id,
      user_query: query,
      application: 'arns-search'
    }
    if (client_id) {
      ubi['client_id'] = client_id
    }
    const result = await this.opensearchClient.search({
      index: this.searchIndexName,
      body: {
        ext: { ubi },
        query: {
          combined_fields: {
            fields: [ 'title', 'meta_description', 'headings', 'body' ],
            query
          }
        },
        from,
        size,
        highlight: {
          fields: {
            body: {
              fragment_size: 150,
              number_of_fragments: 3,
              pre_tags: [ `[[h]]` ],
              post_tags: [ `[[/h]]` ]
            }
          }
        }
      }
    })
    const total_results = typeof result.body.hits.total === 'number'
      ? result.body.hits.total
      : result.body.hits.total?.value || 0
    this.logger.log(
      `Search for query "${query}" took [${result.body.took}ms]`
        + ` with hits [${result.body.hits.hits.length}],`
        + ` total results [${total_results}],`
        + ` query_id [${query_id}]`
        + (client_id ? ` and client_id [${client_id}]` : '')
    )

    return {
      took: result.body.took,
      total_results,
      query_id,
      hits: result.body.hits.hits
        .map(hit => {
          if (hit._source) {
            if (hit.highlight && hit.highlight.body) {
              hit._source.body = stripHtml(hit.highlight.body.join('  '))
                .result
                .replaceAll(
                  `[[h]]`,
                  `<${this.HIGHLIGHT_HTML_TAG}>`
                ).replaceAll(
                  `[[/h]]`,
                  `</${this.HIGHLIGHT_HTML_TAG}>`
                )
            }
          }
          return hit._source
        })
        .filter(hit => !!hit)
    }
  }
}
