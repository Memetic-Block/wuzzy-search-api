# Wuzzy Search API

A NestJS-based search API that provides search functionality over OpenSearch with integrated metrics tracking using BullMQ.

## Features

- **OpenSearch Integration** - Full-text search with highlighting across title, meta description, headings, and body content
- **Metrics Tracking** - Automatic search metrics collection via BullMQ/Redis queue for downstream analytics
- **Graceful Degradation** - Search functionality continues even if Redis/metrics system is unavailable
- **Flexible Redis Support** - Supports both standalone and Redis Sentinel configurations

## Architecture

The API acts as a proxy to OpenSearch with the following flow:

1. Client sends search query to `/search` endpoint
2. API executes search against OpenSearch index
3. Results are returned to client immediately
4. Search metrics are asynchronously published to Redis queue (fire-and-forget)
5. Separate metrics consumer service can process events from the queue

## Environment Variables

### Required - OpenSearch Configuration
```bash
SEARCH_INDEX_NAME=your-index-name
ES_HOST=https://opensearch-host:9200
ES_USERNAME=admin
ES_PASSWORD=your-password
ES_USE_TLS=false  # Set to 'true' for TLS
ES_CERT_PATH=/path/to/cert  # Required if ES_USE_TLS=true
```

### Required - Server Configuration
```bash
PORT=3000
CORS_ALLOWED_ORIGIN=*
```

### Required - Redis Configuration
```bash
# For standalone Redis
REDIS_MODE=standalone
REDIS_HOST=localhost
REDIS_PORT=6379

# For Redis Sentinel (production)
REDIS_MODE=sentinel
REDIS_MASTER_NAME=mymaster
REDIS_SENTINEL_1_HOST=sentinel1
REDIS_SENTINEL_1_PORT=26379
REDIS_SENTINEL_2_HOST=sentinel2
REDIS_SENTINEL_2_PORT=26379
REDIS_SENTINEL_3_HOST=sentinel3
REDIS_SENTINEL_3_PORT=26379
```

See `.env.example` for a complete template.

## Project Setup

```bash
# Install dependencies
npm install

# Start Redis (for local development)
docker-compose up -d

# Copy environment template
cp .env.example .env
# Edit .env with your configuration
```

## Running the Application

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

## API Endpoints

### GET /
Health check endpoint. Returns `"OK"` if the service is running.

### GET /search
Search for documents in the OpenSearch index.

**Query Parameters:**
- `q` (required) - Search query string
- `from` (optional) - Pagination offset, default: 0

**Headers:**
- `User-Agent` (optional) - Client user agent, captured in metrics

**Response:**
```json
{
  "took": 42,
  "total_results": 150,
  "hits": [
    {
      "id": "doc-123",
      "title": "Document Title",
      "body": "Highlighted search <strong>results</strong>...",
      "meta_description": "Description text",
      "url": "https://example.com/path",
      "url_host": "example.com",
      "url_path": "/path",
      "url_scheme": "https",
      "url_port": 443,
      "headings": ["Heading 1", "Heading 2"],
      "links": ["https://link1.com", "https://link2.com"],
      "last_crawled_at": "2025-11-14T00:00:00Z"
    }
  ]
}
```

## Metrics Events

Search metrics are published to the `search-metrics` BullMQ queue with the following structure:

```typescript
{
  requestId: string           // Unique request identifier (UUID)
  query: string              // Search query text
  offset: number            // Pagination offset
  executionTimeMs: number   // OpenSearch execution time
  totalResults: number      // Total matching documents
  hitsCount: number         // Number of results returned
  hits: [                   // Array of result details
    {
      documentId: string    // Document ID
      urlHost: string       // URL hostname
      urlPath: string       // URL path
      score: number         // Relevance score
    }
  ]
  timestamp: string         // ISO 8601 timestamp
  userAgent?: string        // Client user agent (optional)
}
```

**Job Configuration:**
- Job deduplication via hash of `query + offset + rounded_timestamp + requestId`
- 3 retry attempts with exponential backoff
- Completed jobs removed immediately
- Failed jobs retained (last 100)

## Development

```bash
# Run tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Linting
npm run lint
```

## Deployment

The application is deployed using HashiCorp Nomad. See the `operations/` directory for deployment configurations:

- `wuzzy-search-api-dev.hcl` - Development environment
- `wuzzy-search-api-stage.hcl` - Staging environment
- `wuzzy-search-api-live.hcl` - Production environment

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0) - see the [LICENSE](LICENSE) file for details.

