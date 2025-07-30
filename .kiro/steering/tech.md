---
inclusion: always
---

# Technical Architecture & Development Guidelines

## Core Stack

### Frontend

- **Framework**: Nuxt 3 (LTS v3.11+) with Nitro v3
- **Language**: TypeScript 5.x with strict mode enabled
- **Styling**: Tailwind CSS v4 + UnoCSS for on-demand utilities
- **State Management**: Pinia v3 with auto-imported stores
- **Forms**: VueUseForm for form handling
- **Validation**: Zod schemas for runtime validation

### Backend

- **Runtime**: Node.js 22.x (managed via .nvmrc)
- **Framework**: Nitro (built into Nuxt)
- **API**: Nuxt API routes for REST endpoints
- **Authentication**: Custom JWT + Cookie-based implementation
- **ORM**: Prisma with dual database support

### Database

- **Development**: SQLite (lightweight, local)
- **Production**: MySQL (private network deployment)
- **Cache**: Not implemented (Redis if needed)

### Infrastructure

- **Hosting**: Ubuntu server in private network
- **Deployment**: Docker containers
- **Static Files**: Local storage + Nginx for delivery
- **Monitoring**: Sentry (errors) + Uptime Kuma (health checks)

## Development Standards

### Code Style

- Use TypeScript strict mode with `resolveJsonModule: true`
- Leverage `~/` path aliases for imports
- Follow ESLint v9 flat config with @nuxt/eslint and Stylistic rules
- No Prettier - ESLint handles all formatting

### File Organization

- API routes: `server/api/` directory structure
- Components: Auto-imported from `components/` directory
- Composables: Auto-imported from `composables/` directory
- Types: Centralized in `types/` directory
- Stores: Pinia stores in `stores/` directory
- Validation schemas: `lib/validations/` directory

### Testing Strategy

- **Unit/Integration**: Vitest with @nuxt/test-utils
- **E2E**: Playwright for end-to-end testing
- **API Testing**: Direct server endpoint testing
- Test files follow `*.test.ts` naming convention

### Database Patterns

- Use Prisma schema for type-safe database operations
- Implement proper error handling for database operations
- Support both MySQL (production) and SQLite (development)
- Use database migrations for schema changes

### Authentication Flow

- JWT tokens stored in HTTP-only cookies
- Custom middleware for route protection
- User session management with refresh token support
- Client-side auth state management via composables

### API Design

- RESTful endpoints following `/api/resource/[id]` pattern
- Consistent error response format
- Input validation using Zod schemas
- Proper HTTP status codes and error handling

## Development Workflow

### Package Management

- Use `npm` as the package manager
- Node.js version locked to 22.x via .nvmrc
- No pre-commit hooks (husky not implemented)

### CI/CD

- GitHub Actions with Node.js 22
- Use `npm ci` for dependency installation
- Self-hosted runner for private network deployment

### Environment Setup

- Development uses SQLite for quick setup
- Environment variables managed via `.env` file
- Docker containerization for production deployment

## Key Constraints

- Private network deployment only
- No external CDN usage for assets
- Custom authentication implementation (no third-party auth)
- Responsive design for both desktop and mobile Safari/Chrome
