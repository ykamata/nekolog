# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nekolog is a comprehensive cat care management application built with Nuxt 3 and TypeScript. The app tracks multiple cats with meal recording, medication management, veterinary visits, excretion tracking, and analytics visualization.

## Development Commands

### Core Development

```bash
npm run dev &                    # Start development server on port 3000
npm run build                    # Build for production
npm run build:validate           # Validate build output
npm run generate                 # Generate static site
npm run preview                  # Preview production build
```

### Code Quality

```bash
npm run lint                     # Run ESLint
npm run lint:fix                 # Run ESLint with auto-fix
npm run typecheck                # Run TypeScript type checking
npm run format                   # Format code (alias for lint:fix)
```

### Testing

#### Vitest (Unit/Integration Tests)

```bash
npm test                         # Run unit tests with Vitest
npm run test:run                 # Same as npm test
npm run test:components          # Run component tests only
npm run test:performance         # Run performance tests
npm run test:agent               # Run all tests with comprehensive reporting
npm run test:agent [category]    # Run tests by category (api, components, composables, auth, accessibility, performance)
npm run test:agent:watch         # Run tests in watch mode
npm run test:agent:coverage      # Run tests with coverage report
npm run test:agent:verbose       # Run tests with verbose output
```

#### Playwright (E2E Tests)

```bash
npm run test:e2e                 # Run Playwright end-to-end tests
npm run test:e2e:ui              # Run E2E tests with Playwright UI
npm run test:e2e:headed          # Run E2E tests in headed mode
npm run test:e2e:debug           # Debug E2E tests
```

### Database Management

```bash
npm run db:generate              # Generate Prisma client (SQLite)
npm run db:generate:mysql        # Generate Prisma client (MySQL)
npm run db:migrate               # Run database migrations (development)
npm run db:migrate:prod          # Deploy migrations to production (MySQL)
npm run db:push                  # Push schema changes to database
npm run db:studio                # Open Prisma Studio (SQLite)
npm run db:studio:mysql          # Open Prisma Studio (MySQL)
npm run db:seed                  # Seed database with test data
npm run db:seed:mysql            # Seed MySQL database
npm run db:reset                 # Reset database and run migrations
```

### Docker Operations

```bash
npm run docker:up                # Start all containers
npm run docker:down              # Stop all containers
npm run docker:build             # Build Docker images
npm run docker:rebuild           # Rebuild containers from scratch
npm run docker:logs              # View all container logs
npm run docker:logs:app          # View app container logs
npm run docker:logs:mysql        # View MySQL container logs
npm run docker:shell:app         # Access app container shell
npm run docker:shell:mysql       # Access MySQL shell
npm run docker:seed              # Seed database in Docker
npm run docker:studio            # Open Prisma Studio in Docker
npm run docker:clean             # Clean Docker volumes and cache
```

## Project Structure

```
nekolog/
├── app.vue                      # Root Vue application
├── nuxt.config.ts               # Nuxt configuration
├── tsconfig.json                # TypeScript configuration (strict mode)
├── vitest.config.ts             # Vitest test configuration
├── playwright.config.ts         # Playwright E2E configuration
├── tailwind.config.ts           # Tailwind CSS configuration
├── eslint.config.js             # ESLint configuration
├── docker-compose.yml           # Docker services configuration
├── Dockerfile                   # Application container definition
│
├── components/                  # Vue components (70+ components)
│   ├── Cat*.vue                 # Cat management components
│   ├── Meal*.vue                # Meal tracking components
│   ├── Medication*.vue          # Medication management components
│   ├── Veterinary*.vue          # Veterinary visit components
│   ├── Excretion*.vue           # Excretion tracking components
│   ├── Chart*.vue               # Data visualization components
│   ├── Auth*.vue                # Authentication UI components
│   └── Error*.vue               # Error handling components
│
├── composables/                 # Reusable composition functions
│   ├── useAuth*.ts              # Authentication composables
│   ├── useChart*.ts             # Chart/visualization composables
│   ├── useVeterinary*.ts        # Veterinary data composables
│   └── use*.ts                  # Other domain composables
│
├── pages/                       # Nuxt pages (file-based routing)
│   ├── index.vue                # Home page
│   ├── cats.vue                 # Cat management
│   ├── foods.vue                # Food management
│   ├── medications.vue          # Medication tracking
│   ├── medication-*.vue         # Medication-related pages
│   ├── veterinary-*.vue         # Veterinary management pages
│   ├── excretion-records.vue    # Excretion tracking
│   ├── analytics.vue            # Analytics dashboard
│   ├── login.vue                # User login
│   ├── register.vue             # User registration
│   └── meals/                   # Nested meal pages
│
├── server/                      # Server-side code
│   ├── api/                     # API routes (organized by feature)
│   │   ├── auth/                # Authentication endpoints
│   │   ├── cats/                # Cat CRUD operations
│   │   ├── foods/               # Food management
│   │   ├── meals/               # Meal recording
│   │   ├── medications/         # Medication CRUD
│   │   ├── medication-*/        # Medication schedules/reminders/records
│   │   ├── veterinary-*/        # Veterinary management
│   │   ├── excretion-records/   # Excretion tracking
│   │   ├── analytics/           # Analytics queries
│   │   └── dashboard/           # Dashboard data
│   └── middleware/              # Server middleware
│
├── stores/                      # Pinia state management
│   ├── analytics.ts             # Analytics store
│   ├── cats.ts                  # Cat data store
│   ├── foods.ts                 # Food data store
│   ├── meals.ts                 # Meal data store
│   └── medications.ts           # Medication data store
│
├── lib/                         # Core utilities
│   ├── auth.ts                  # Authentication logic
│   ├── auth-middleware.ts       # Auth middleware
│   ├── prisma.ts                # Prisma client singleton
│   ├── pino-logger.ts           # Logging configuration
│   └── validations/             # Zod validation schemas
│       ├── cat-meal.ts          # Cat/meal validations
│       ├── medication.ts        # Medication validations
│       ├── excretion.ts         # Excretion validations
│       ├── veterinary-*.ts      # Veterinary validations
│       └── chart-analytics.ts   # Analytics validations
│
├── types/                       # TypeScript type definitions
│   ├── auth.ts                  # Authentication types
│   ├── cat-meal.ts              # Cat and meal types
│   ├── medication.ts            # Medication types
│   ├── excretion.ts             # Excretion types
│   ├── veterinary-*.ts          # Veterinary types
│   └── index.d.ts               # Global type declarations
│
├── utils/                       # Helper functions
│   ├── auth-error-*.ts          # Auth error handling
│   ├── error-handling.ts        # General error utilities
│   ├── cat-meal.ts              # Cat/meal utilities
│   ├── chart-*.ts               # Chart data processing
│   ├── cache.ts                 # Caching utilities
│   ├── offline-storage.ts       # Offline data management
│   └── performance-monitor.ts   # Performance tracking
│
├── middleware/                  # Client-side route middleware
│   ├── auth.ts                  # Auth route guards
│   └── auth-client.ts           # Client-side auth
│
├── prisma/                      # Database configuration
│   ├── schema.prisma            # SQLite schema (development)
│   ├── schema.mysql.prisma      # MySQL schema (production)
│   ├── seed.ts                  # Database seeding script
│   └── migrations/              # Migration files
│
├── tests/                       # Test suites
│   ├── setup.ts                 # Test setup and mocks
│   ├── api/                     # API route tests
│   ├── components/              # Component tests
│   ├── composables/             # Composable tests
│   ├── stores/                  # Store tests
│   ├── auth/                    # Authentication tests
│   ├── accessibility/           # Accessibility tests
│   ├── performance/             # Performance benchmarks
│   ├── validations/             # Validation tests
│   ├── utils/                   # Utility tests
│   ├── integration/             # Integration tests
│   └── e2e/                     # Playwright E2E tests
│
├── scripts/                     # Development scripts
│   ├── vitest-agent.ts          # Test management agent
│   ├── build-validate.js        # Build validation
│   ├── run-performance-tests.js # Performance test runner
│   ├── docker-setup.sh          # Docker setup script
│   ├── deploy-db.sh             # Database deployment
│   └── verify-*.js              # Integration verification
│
├── plugins/                     # Nuxt plugins
├── layouts/                     # Page layouts
├── docker/                      # Docker configuration files
└── docs/                        # Documentation
```

## Architecture Overview

### Database Layer

- **Prisma ORM**: Type-safe database access and migrations
- **SQLite**: Development database (file: `./dev.db`)
- **MySQL 8.0**: Production database (Docker container)
- **Multi-schema support**: `schema.prisma` (SQLite) and `schema.mysql.prisma` (MySQL)
- **Integer IDs**: All models use auto-incrementing integer primary keys

### Core Data Models

```prisma
Cat           - Pet profiles with name, birthdate, weight, photo
Food          - Food catalog (DRY/WET types) with nutritional info
MealRecord    - Meal logging with quantity, calories, timestamps
Medication    - Medicine catalog with dosage information
MedicationRecord/Schedule/Reminder - Medication tracking
VeterinaryHospital/Doctor - Vet master data
VeterinaryVisit - Medical history records
VeterinaryAppointment - Future appointment scheduling
ExcretionRecord - Bathroom habits tracking
User          - Authentication and hospital/doctor ownership
```

### Frontend Architecture

- **Nuxt 3**: Full-stack framework with auto-imports
- **Vue 3 Composition API**: `<script setup lang="ts">` syntax
- **Pinia**: Centralized state management
- **TypeScript**: Strict mode with comprehensive type checking
- **Auto-imports**: Composables, utils, and stores automatically available

### API Pattern

Server API routes follow Nuxt 3 conventions with Zod validation:

```typescript
// server/api/[feature]/index.get.ts
import { z } from 'zod';
import { prisma } from '~/lib/prisma';

const querySchema = z.object({
  limit: z.string().transform(Number).pipe(z.number().positive()).optional(),
});

export default defineEventHandler(async (event) => {
  try {
    assertMethod(event, 'GET');
    const query = getQuery(event);
    const validated = querySchema.parse(query);

    const data = await prisma.model.findMany({ ... });
    return data;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({ statusCode: 400, data: error.errors });
    }
    throw createError({ statusCode: 500, statusMessage: 'Internal server error' });
  }
});
```

### Authentication System

- **JWT-based**: Access tokens (short-lived) and refresh tokens (long-lived)
- **bcryptjs**: Password hashing with salt rounds
- **jose**: Token generation and validation
- **HttpOnly cookies**: Secure token storage
- **Route guards**: Client and server-side authentication middleware

### Validation Strategy

- **Zod schemas**: All input validation using Zod
- **Centralized definitions**: `lib/validations/` for reusable schemas
- **Type inference**: TypeScript types derived from Zod schemas
- **Error messages**: Japanese language error messages for end users

### Styling and UI

- **Tailwind CSS**: Utility-first CSS framework
- **UnoCSS**: Additional atomic CSS with icons and attributify
- **Chart.js/Vue-ChartJS**: Interactive data visualization
- **Responsive Design**: Mobile-first approach
- **Japanese Language**: UI text primarily in Japanese

## Coding Conventions

### TypeScript

- Strict mode enabled with all strict flags
- `noUncheckedIndexedAccess: true` - Always check array/object access
- `noImplicitReturns: true` - All code paths must return
- Use type imports: `import type { Type } from '~/types/...'`
- Path aliases: `~/`, `@/`, `~~/`, `@@/` all resolve to project root

### ESLint Rules

- `no-console: warn` - Console logs generate warnings
- `no-debugger: error` - Debugger statements are errors
- `prefer-const: error` - Use const when possible
- `no-var: error` - No var declarations
- Stylistic: 2-space indentation, single quotes, semicolons

### Vue Components

- Use `<script setup lang="ts">` for all components
- Props destructure enabled (`defineProps` with destructuring)
- Composition API with reactive refs and computed properties
- Component naming: PascalCase (e.g., `CatProfileCard.vue`)

### API Routes

- File naming convention: `[method].ts` (e.g., `index.get.ts`, `[id].put.ts`)
- Always validate input with Zod schemas
- Use Prisma for all database operations
- Return consistent error responses with `createError()`
- Include logging with emojis for debugging (Japanese comments)

### Error Handling

- Centralized error utilities in `utils/error-handling.ts`
- Auth-specific errors in `utils/auth-error-*.ts`
- Always catch and transform Zod validation errors
- Provide meaningful error messages for users

## Environment Setup

### Required Environment Variables

```env
# Database
DATABASE_URL="file:./dev.db"                    # SQLite (development)
# DATABASE_URL="mysql://user:pass@localhost:3306/nekolog"  # MySQL (production)

# Authentication
JWT_SECRET="your-super-secret-jwt-key"

# Application
NODE_ENV="development"                          # or "production"
PORT=3000                                       # Server port
```

### Node.js Version

- Minimum: Node.js 20.0.0 (specified in package.json engines)
- Recommended: Use `.nvmrc` file for version management

## Docker Development

The project includes a complete Docker setup for production-like development:

### Services

1. **MySQL 8.0** (`nekolog-mysql`)
   - Character set: utf8mb4
   - Persistent volume for data
   - Health checks enabled
   - Default credentials in docker-compose.yml

2. **Node.js App** (`nekolog-app`)
   - Builds from Dockerfile
   - Hot reload enabled via volume mounts
   - Depends on MySQL health check
   - Exposes port 3000

### Docker Workflow

```bash
# Start development environment
npm run docker:up

# View logs
npm run docker:logs

# Seed database
npm run docker:seed

# Clean restart
npm run docker:rebuild
```

## Testing Strategy

### Test Organization

Tests are organized by type in the `/tests/` directory:

- **api/**: API endpoint tests
- **components/**: Vue component tests with Vue Test Utils
- **composables/**: Composition function tests
- **stores/**: Pinia store tests
- **auth/**: Authentication flow tests
- **accessibility/**: A11y compliance tests (with @axe-core)
- **performance/**: Performance benchmarking
- **validations/**: Zod schema validation tests
- **integration/**: Cross-feature integration tests
- **e2e/**: End-to-end browser tests (Playwright)

### Test Setup

Global test setup in `tests/setup.ts` provides:
- Mock implementations for Nuxt composables
- Happy DOM environment configuration
- Common test utilities and helpers

### Running Tests

```bash
# Full test suite
npm test

# Specific category
npm run test:agent components

# With coverage
npm run test:agent:coverage

# E2E tests
npm run test:e2e
```

## Performance Considerations

- **Chart Performance**: Optimized chart components with caching
- **Virtual Scrolling**: `VirtualScroll.vue` for large lists
- **Lazy Loading**: Deferred loading for heavy components
- **Offline Storage**: IndexedDB-based offline capabilities
- **Query Optimization**: Prisma relations with selective includes
- **Caching**: In-memory caching for frequently accessed data

## Important Notes for AI Assistants

1. **Language**: Application uses Japanese for UI text and log messages
2. **ID Types**: All IDs are integers (auto-increment), not strings
3. **Validation**: Always use Zod for input validation
4. **Error Handling**: Follow established patterns in `utils/error-handling.ts`
5. **Testing**: Write tests for new features following existing patterns
6. **Type Safety**: Leverage TypeScript strict mode - avoid `any` types
7. **State Management**: Use Pinia stores for shared state
8. **API Design**: Follow RESTful conventions with proper HTTP methods
9. **Security**: Never expose sensitive data in responses
10. **Documentation**: Add JSDoc comments for complex functions
