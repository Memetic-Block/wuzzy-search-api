# Copilot Instructions for Wuzzy Search API

## Project Overview

This is a NestJS-based search API that integrates with OpenSearch, featuring User Behavior Insights (UBI) tracking for search analytics. The application provides full-text search capabilities across indexed web documents with highlight snippets.

## Architecture

- **Framework**: NestJS (Node.js/TypeScript)
- **Search Engine**: OpenSearch with UBI plugin
- **Client Library**: `@opensearch-project/opensearch`
- **Key Features**: Combined fields search, HTML highlight processing, client tracking

## Key Patterns and Conventions

### OpenSearch Integration

- Use `combined_fields` query type to search across multiple document fields: `title`, `meta_description`, `headings`, and `body`
- Always include UBI extension in search queries with `object_id_field`, `query_id`, `user_query`, and `application` fields
- Track client behavior via optional `client_id` field in UBI data
- Generate unique `query_id` using `randomUUID()` for each search request

### Highlight Processing

- Use custom highlight tags `[[h]]` and `[[/h]]` in OpenSearch queries to avoid conflicts with HTML in indexed content
- Strip HTML from highlighted fragments using `string-strip-html` library
- Replace custom tags with `<strong>` tags for final output
- Join multiple highlight fragments with double spaces

### Client Tracking

- Accept client tracking via HTTP headers: `x-client-name`, `x-client-version`, `x-session-id`
- Combine tracking headers into a single `client_id` string: `{name}@{version}@{session}`
- Log warnings when client tracking headers are missing
- Pass `client_id` to OpenSearch UBI for analytics

### Configuration Management

- Use `@nestjs/config` with typed `ConfigService` for environment variables
- Validate required configuration on service construction (fail fast)
- Support optional TLS/SSL with certificate file path
- Default `UBI_STORE_NAME` to `.ubi_queries` if not specified

### Logging

- Use NestJS `Logger` with class-specific contexts
- Log search execution details: query, offset, size, query_id, client_id
- Log search results: response time, hit count, total results
- Log OpenSearch connection status on application bootstrap

### Error Handling

- Throw descriptive errors for missing required configuration
- Verify OpenSearch connectivity on application bootstrap
- Log errors with appropriate context before throwing

## Environment Variables

All environment variables are required unless noted as optional:

- `SEARCH_INDEX_NAME` - OpenSearch index name for document search
- `ES_HOST` - OpenSearch cluster URL (e.g., `https://localhost:9200`)
- `ES_USERNAME` - OpenSearch authentication username
- `ES_PASSWORD` - OpenSearch authentication password
- `ES_USE_TLS` - Enable TLS/SSL (`true` or `false`)
- `ES_CERT_PATH` - Path to CA certificate file (required if `ES_USE_TLS=true`)
- `UBI_STORE_NAME` - UBI index name (optional, defaults to `.ubi_queries`)
- `PORT` - HTTP server port (optional, defaults to `3000`)
- `CORS_DOMAINS` - CORS allowed origins (optional, defaults to `*`)

## Code Style

- Use TypeScript with strict typing
- Prefer `readonly` for class properties that don't change
- Use template literals for multi-line strings and string concatenation
- Use optional chaining and nullish coalescing operators
- Follow NestJS conventions: controllers for HTTP, services for business logic
- Use dependency injection via constructor parameters
- Implement lifecycle hooks (`OnApplicationBootstrap`) for initialization logic

## Testing Considerations

- Mock OpenSearch client in unit tests
- Test configuration validation (missing required env vars)
- Test highlight processing with various HTML content
- Test client_id formatting with different header combinations
- Verify UBI data structure in search requests

## OpenSearch Requirements

- OpenSearch cluster must have UBI plugin installed and enabled
- Search index must contain fields: `id`, `title`, `meta_description`, `headings`, `body`, `url`, and related URL components
- Index documents should be web page content with HTML in body field
- UBI queries index (default `.ubi_queries`) must be accessible for analytics tracking

## Important Notes
- Do not install dependencies.  Instead, provide a summary of dependency updates to the user so they can manually install or remove before implementation begins.
- Do not modify package.json.  Instead, provide a summary of changes to the user so they can manually update it before or after implementation.
- Do not run the app itself, the user will handle manual spot testing.
- Make sure the app compiles with `npm run build`.
