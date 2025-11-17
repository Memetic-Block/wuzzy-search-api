export interface IndexedDocumentHit {
  id: string
  last_crawled_at: string
  title: string
  body?: string
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
  query_id: string
  hits: IndexedDocumentHit[]
}
