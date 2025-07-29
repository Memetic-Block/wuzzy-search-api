import { Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Client, ConnectionOptions } from '@elastic/elasticsearch'
import * as fs from 'fs'

export interface IndexedDocument {
  id: string
  last_crawled_at: string
  title: string
  body: string
  meta_description: string
  links: string[]
  headings: string[]
  url: string
  url_scheme: string
  url_host: string
  url_port: number
  url_path: string
  url_path_dir1: string
  url_path_dir2: string
}

export interface SearchResults {
  took: number
  total_results: number
  hits: IndexedDocument[]
}

@Injectable()
export class AppService implements OnApplicationBootstrap {
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
      console.log(`Reading Elasticsearch CA certificate from [${esCertPath}]`)
      const ca = fs.readFileSync(esCertPath)
      tls = {
        ca,

        // !!! For development purposes, consider setting this to true in prod!
        rejectUnauthorized: false
      }
    }

    console.log(
      `Initializing Elasticsearch client with url [${esHost}] ` +
        `and username [${esUsername}]`
    )
    console.log(`Using search index [${this.searchIndexName}]`)
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
    console.log('Application bootstrap started...')
    try {
      console.log('Checking Elasticsearch connection...')
      const isElasticSearchReachable = await this.elasticSearchClient.ping()
      if (!isElasticSearchReachable) {
        throw new Error('Elasticsearch is not reachable!')
      }
      console.log('Elasticsearch is reachable.')
    } catch (error) {
      console.error('Error during application bootstrap:', error)
      throw error
    }
    console.log('Application bootstrap completed successfully.')
  }

  getHealth(): string {
    return 'OK'
  }

  async getSearch(query: string): Promise<SearchResults> {
    console.log(`Executing search for query: ${query}`)
    try {
      const result = await this.elasticSearchClient.search<IndexedDocument>({
        index: this.searchIndexName,
        query: {
          combined_fields: {
            fields: [ 'title', 'meta_description', 'headings', 'body' ],
            query
          }
        },
        size: 100
      })

      console.log(
        `Search for query "${query}" took [${result.took}ms] ` +
          `with total hits [${result.hits.hits.length}]`
      )

      return {
        took: result.took,
        total_results: result.hits.hits.length,
        hits: result.hits.hits
          .map(hit => {
            if (hit._source) {
              hit._source.body = hit._source.body.length > this.BODY_MAX_LENGTH
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
    } catch (error) {
      console.error('Error executing search:', error)

      return {
        took: 0,
        total_results: 0,
        hits: []
      }
    }
  }
}
