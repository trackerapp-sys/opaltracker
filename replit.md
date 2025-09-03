# Opal Auction Tracker

## Overview

This is a full-stack web application for tracking opal auctions, built with React (frontend) and Express.js (backend). The application allows users to monitor and manage opal auction bids across different Facebook groups, providing analytics and insights for auction performance. The system tracks auction details including opal types, weights, bidding information, and auction outcomes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing
- **UI Components**: Radix UI primitives with shadcn/ui components for consistent design
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation

**Key Design Decisions**:
- Component-based architecture with reusable UI components
- Custom hook patterns for mobile responsiveness and toast notifications
- Centralized query client configuration for API requests
- Path aliases for clean imports (@/, @shared/, @assets/)

### Backend Architecture

**Framework**: Express.js with TypeScript
- **Development Setup**: tsx for TypeScript execution in development
- **Production Build**: esbuild for fast bundling
- **API Structure**: RESTful endpoints under /api prefix
- **Error Handling**: Centralized error middleware with structured error responses
- **Request Logging**: Custom middleware for API request/response logging

**Storage Layer**:
- Interface-based storage abstraction (IStorage)
- In-memory storage implementation (MemStorage) for development
- Prepared for database integration with Drizzle ORM

### Data Storage Solutions

**Database Schema** (Drizzle ORM with PostgreSQL):
- **auctions table**: Core entity storing all auction information
- Fields include: opal details, bidding information, timestamps, status tracking
- Uses UUID primary keys with PostgreSQL-specific features

**Database Configuration**:
- Drizzle Kit for migrations and schema management
- Neon Database serverless PostgreSQL integration
- Environment-based database URL configuration

### Development Tools

**Build System**:
- Vite for frontend development with HMR
- ESBuild for production backend bundling
- TypeScript configuration with path mapping
- PostCSS with Tailwind CSS processing

**Development Features**:
- Replit-specific integrations and banner
- Runtime error overlay for development
- Cartographer plugin for Replit environment

### API Structure

**Core Endpoints**:
- `GET /api/auctions` - List auctions with filtering and pagination
- `GET /api/auctions/:id` - Get single auction details
- `POST /api/auctions` - Create new auction
- `PUT /api/auctions/:id` - Update auction (partial)
- `DELETE /api/auctions/:id` - Delete auction
- `GET /api/analytics` - Get auction analytics and statistics
- `POST /api/export` - Export auction data

**Data Validation**:
- Zod schemas for request validation
- Type-safe data transformation between client and server
- Shared schema definitions for consistency

### Authentication and Authorization

Currently implemented as a single-user application without authentication. The architecture supports future multi-user implementation through the storage interface abstraction.

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM
- **express**: Web framework for API server
- **react**: Frontend UI library
- **@tanstack/react-query**: Server state management

### UI and Styling
- **@radix-ui/***: Headless UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library

### Development Tools
- **vite**: Frontend build tool and development server
- **typescript**: Type safety across the stack
- **tsx**: TypeScript execution for development
- **esbuild**: Fast JavaScript bundler for production

### Form and Validation
- **react-hook-form**: Form state management
- **@hookform/resolvers**: Form validation resolvers
- **zod**: Schema validation and type inference

### Additional Utilities
- **date-fns**: Date manipulation and formatting
- **wouter**: Lightweight routing for React
- **nanoid**: Unique ID generation
- **clsx**: Conditional className utility

The application is structured as a monorepo with shared TypeScript definitions, enabling type safety across the full stack while maintaining clear separation between client and server concerns.