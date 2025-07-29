# Nekolog

A comprehensive cat care management application built with Nuxt 3 and TypeScript.

## Features

- **Cat Management**: Track multiple cats with detailed profiles
- **Meal Recording**: Log feeding times, food types, and portions
- **Medication Management**: Schedule and track medication administration
- **Analytics**: Visualize feeding patterns and medication adherence
- **Offline Support**: Continue using the app without internet connection

## Tech Stack

- **Frontend**: Nuxt 3, Vue 3, TypeScript
- **Styling**: Tailwind CSS, UnoCSS
- **Database**: Prisma ORM with SQLite (dev) / MySQL (prod)
- **State Management**: Pinia
- **Testing**: Vitest, Playwright
- **Authentication**: JWT-based auth system

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/ykamata/nekolog.git
cd nekolog

# Install dependencies
npm install

# Set up the database
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-jwt-secret"
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run lint` - Run ESLint
- `npm run db:studio` - Open Prisma Studio

## License

MIT