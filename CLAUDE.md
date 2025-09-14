# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nekolog is a comprehensive cat care management application built with Nuxt 3 and TypeScript. The app tracks multiple cats with meal recording, medication management, veterinary visits, and analytics visualization.

## Development Commands

### Core Development

- `npm run dev &` - Start development server on port 3000
- `npm run build` - Build for production
- `npm run generate` - Generate static site
- `npm run preview` - Preview production build

### Code Quality

- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run typecheck` - Run TypeScript type checking
- `npm run format` - Format code (alias for lint:fix)

### Testing

- `npm test` or `npm run test:run` - Run unit tests with Vitest
- `npm run test:components` - Run component tests only
- `npm run test:performance` - Run performance tests
- `npm run test:e2e` - Run Playwright end-to-end tests
- `npm run test:e2e:ui` - Run E2E tests with Playwright UI
- `npm run test:e2e:headed` - Run E2E tests in headed mode
- `npm run test:e2e:debug` - Debug E2E tests

### Database Management

- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations (development)
- `npm run db:migrate:prod` - Deploy migrations to production (MySQL)
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with test data
- `npm run db:reset` - Reset database and run migrations

## Architecture Overview

### Database Layer

- **Prisma ORM**: Database access and migrations
- **SQLite**: Development database (file: `./dev.db`)
- **MySQL**: Production database
- **Multi-schema support**: `schema.prisma` (SQLite) and `schema.mysql.prisma` (MySQL)

### Core Models

- **Cat**: Pet profiles with basic info and relationships
- **Food/MealRecord**: Food tracking and meal logging
- **Medication**: Medicine management with schedules and records
- **VeterinaryVisit**: Vet appointments and medical history
- **ExcretionRecord**: Bathroom habits tracking
- **User**: Authentication and ownership

### Frontend Architecture

- **Nuxt 3**: Full-stack framework with auto-imports
- **Vue 3 Composition API**: Component logic
- **Pinia**: State management (stores in `/stores/`)
- **TypeScript**: Strict type checking enabled

### Key Directories

- `/components/` - Vue components (50+ specialized components)
- `/composables/` - Reusable composition functions
- `/server/api/` - API routes organized by feature
- `/stores/` - Pinia state management
- `/lib/` - Core utilities (auth, database, validations)
- `/types/` - TypeScript type definitions
- `/utils/` - Helper functions and utilities

### Authentication System

- **JWT-based auth**: Access tokens and refresh tokens
- **bcryptjs**: Password hashing
- **Cookie-based storage**: HttpOnly cookies for security
- **Middleware**: Authentication guards for routes

### Testing Strategy

- **Unit Tests**: Vitest with Happy DOM
- **Component Tests**: Vue Test Utils
- **Integration Tests**: API and database testing
- **E2E Tests**: Playwright across multiple browsers
- **Performance Tests**: Custom benchmarking suite

### Styling and UI

- **Tailwind CSS**: Utility-first CSS framework
- **UnoCSS**: Atomic CSS engine
- **Chart.js/Vue-ChartJS**: Data visualization
- **Responsive Design**: Mobile-first approach

## Environment Setup

Required environment variables:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-jwt-secret"
```

## Build and Deployment

The application supports dual database configurations:

- Development: SQLite with `schema.prisma`
- Production: MySQL with `schema.mysql.prisma`

Use `npm run db:migrate:prod` for production deployments.

## Performance Considerations

- Chart components include performance monitoring
- Lazy loading implemented for large datasets
- Offline storage capabilities for medication tracking
- Optimized queries with Prisma relations
