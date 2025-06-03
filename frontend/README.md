# SlotWise Frontend

The SlotWise frontend is a modern React application built with Next.js 14,
providing a responsive and intuitive user interface for the scheduling platform.

## 🎯 Overview

This frontend application serves as the customer-facing interface for SlotWise,
allowing users to:

- Browse and book services from businesses
- Manage their appointments
- View business profiles and availability
- Handle payments and confirmations

## 🛠️ Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS for responsive design
- **State Management**: Zustand for client state
- **Data Fetching**: TanStack Query (React Query)
- **Authentication**: JWT-based auth with refresh tokens
- **Forms**: React Hook Form with Zod validation
- **UI Components**: Custom components with Radix UI primitives

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend services running (see main README.md)

### Development Setup

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Set up environment variables**:

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Start the development server**:

   ```bash
   npm run dev
   ```

4. **Open your browser**: Navigate to
   [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
├── components/             # Reusable UI components
├── lib/                   # Utilities and configurations
├── hooks/                 # Custom React hooks
├── stores/                # Zustand state stores
├── types/                 # TypeScript type definitions
├── styles/                # Global styles and Tailwind config
└── public/                # Static assets
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler check

## 🌐 Environment Variables

Required environment variables:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📚 Documentation

- [Component Documentation](./docs/components.md)
- [State Management](./docs/state-management.md)
- [API Integration](./docs/api-integration.md)

## 🧪 Testing

```bash
npm run test          # Run unit tests
npm run test:watch    # Run tests in watch mode
npm run test:e2e      # Run end-to-end tests
```

## 🚀 Deployment

The frontend is deployed using Vercel. See the main project documentation for
deployment instructions.
