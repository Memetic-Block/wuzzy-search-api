# Wuzzy Search API

A NestJS-based search API that provides full-text search capabilities powered by OpenSearch with User Behavior Insights (UBI) tracking for search analytics.

## Features

- **Full-Text Search**: Search across multiple document fields (title, meta description, headings, body) using OpenSearch's `combined_fields` query
- **Highlight Snippets**: Returns contextual snippets from document body with search terms highlighted in `<strong>` tags
- **User Behavior Insights**: Tracks search queries with unique query IDs for analytics and search quality improvement
- **Client Tracking**: Optional client identification headers for tracking user sessions and application versions
- **Health Check**: Simple health endpoint for monitoring and load balancer checks
- **CORS Support**: Configurable CORS domains for cross-origin requests

## Requirements

- Node.js 18+ (LTS recommended)
- OpenSearch cluster with UBI plugin installed
- Access to an OpenSearch index with searchable documents

## Environment Variables

Create a `.env` file in the project root with the following variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SEARCH_INDEX_NAME` | ✅ | - | OpenSearch index name containing searchable documents |
| `ES_HOST` | ✅ | - | OpenSearch cluster URL (e.g., `https://localhost:9200`) |
| `ES_USERNAME` | ✅ | - | OpenSearch authentication username |
| `ES_PASSWORD` | ✅ | - | OpenSearch authentication password |
| `ES_USE_TLS` | ❌ | `false` | Enable TLS/SSL connection (`true` or `false`) |
| `ES_CERT_PATH` | ⚠️ | - | Path to CA certificate file (required if `ES_USE_TLS=true`) |
| `UBI_STORE_NAME` | ❌ | `.ubi_queries` | OpenSearch index name for UBI query storage |
| `PORT` | ❌ | `3000` | HTTP server port |
| `CORS_DOMAINS` | ❌ | `*` | Comma-separated list of allowed CORS origins |

### Example `.env` file

```env
SEARCH_INDEX_NAME=web-documents
ES_HOST=https://opensearch.example.com:9200
ES_USERNAME=search-user
ES_PASSWORD=your-secure-password
ES_USE_TLS=true
ES_CERT_PATH=/path/to/ca-cert.pem
UBI_STORE_NAME=.ubi_queries
PORT=3000
CORS_DOMAINS=https://example.com,https://app.example.com
```

## Installation

```bash
npm install
```

## Running the Application

```bash
# Development mode with auto-reload
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Standard development mode
npm run start
```

## API Endpoints

### Health Check

Check if the API is running.

**Request:**
```bash
curl http://localhost:3000/
```

**Response:**
```
OK
```

### Search

Perform a full-text search across indexed documents.

**Endpoint:** `GET /search`

**Query Parameters:**
- `q` (required): Search query string
- `from` (optional): Pagination offset, defaults to `0`

**Request Headers (Optional):**
- `x-client-name`: Client application name (e.g., `web-app`)
- `x-client-version`: Client application version (e.g., `1.2.0`)
- `x-session-id`: User session identifier (e.g., `abc123xyz`)

**Example Request (Basic):**
```bash
curl "http://localhost:3000/search?q=arweave&from=0"
```

**Example Request (With Client Tracking):**
```bash
curl "http://localhost:3000/search?q=arweave&from=0" \
  -H "x-client-name: web-app" \
  -H "x-client-version: 1.2.0" \
  -H "x-session-id: user-session-123"
```

**Example Response:**
```json
{
  "took": 45,
  "total_results": 127,
  "query_id": "f7c3a8b2-4d1e-4a9c-b8f3-1e2d3c4b5a6f",
  "hits": [
    {
      "id": "doc-123",
      "title": "Introduction to Arweave",
      "meta_description": "Learn about Arweave's permanent storage protocol",
      "body": "Arweave is a decentralized storage network... <strong>Arweave</strong> allows you to store data permanently...",
      "url": "https://example.com/arweave-intro",
      "url_scheme": "https",
      "url_host": "example.com",
      "url_port": 443,
      "url_path": "/arweave-intro",
      "url_path_dir1": "",
      "url_path_dir2": "",
      "headings": ["What is Arweave?", "How it Works"],
      "links": ["https://arweave.org"],
      "last_crawled_at": "2025-11-15T10:30:00Z"
    }
  ]
}
```

**Response Fields:**
- `took`: Search execution time in milliseconds
- `total_results`: Total number of matching documents
- `query_id`: Unique identifier for this search query (used for UBI tracking)
- `hits`: Array of matching documents (max 20 per request)
  - `body`: Document body with search terms wrapped in `<strong>` tags (up to 3 highlight snippets)
  - Other fields from the indexed document

## Docker

Build and run using Docker:

```bash
# Build image
docker build -t wuzzy-search-api .

# Run container
docker run -p 3000:3000 --env-file .env wuzzy-search-api
```

## Development

```bash
# Run tests
npm run test

# Run e2e tests
npm run test:e2e

# Run tests with coverage
npm run test:cov

# Lint and fix code
npm run lint

# Format code
npm run format
```

## OpenSearch Index Requirements

The search index should contain documents with the following fields:

- `id`: Unique document identifier
- `title`: Document title
- `meta_description`: Meta description or summary
- `headings`: Array of heading text
- `body`: Full document body content (can contain HTML)
- `url`: Full document URL
- `url_scheme`, `url_host`, `url_port`, `url_path`: URL components
- `url_path_dir1`, `url_path_dir2`: URL path directory levels
- `links`: Array of outbound links
- `last_crawled_at`: Timestamp of last document update
