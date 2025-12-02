# Bhuiyan & Subedari Estate Manager

## Overview

Bhuiyan & Subedari Estate Manager is a commercial property management system designed to manage "Haji Ahsan Ullah Bhuiyan Market & Subedari" - a multi-owner commercial building with 3 floors (Ground, 1st, 2nd) and 5 distinct property owners. The system handles shop ownership (both sole and common), tenant management, lease agreements, rent collection, financial tracking, and comprehensive reporting for a data-heavy property management operation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build Tool**
- React 18 with TypeScript using Vite as the build tool
- Single-page application (SPA) architecture with client-side routing via Wouter

**State Management Strategy**
- **Server State**: TanStack Query (React Query) with aggressive caching (`staleTime: Infinity`) for all API data
- **Client State**: Zustand store for currency preferences (BDT/AUD toggle with exchange rates)
- **Form State**: React Hook Form with Zod validation resolvers for type-safe form handling

**UI Component System**
- Shadcn/ui component library (New York variant) built on Radix UI primitives
- Tailwind CSS for styling with custom design tokens defined in `tailwind.config.ts`
- Inter font family via Google Fonts for consistent typography
- Theme system supporting light/dark modes with CSS variables for colors

**Design Philosophy**
- Modern enterprise dashboard inspired by Linear/Stripe design patterns
- Emphasis on information hierarchy for scanning critical financial data
- Operational efficiency with minimal clicks for common tasks
- Professional credibility through precise typography (tabular numbers for financial displays)
- Standardized spacing using Tailwind units (2, 4, 6, 8)

### Backend Architecture

**Server Framework**
- Express.js with TypeScript running on Node.js
- HTTP server created via Node's `createServer` for potential WebSocket upgrades

**API Design Pattern**
- RESTful API with all endpoints under `/api/*` namespace
- JSON body parsing with raw body preservation (for webhook support)
- URL-encoded form data support

**Request Processing Middleware**
- Custom logging middleware tracking request method, path, response time, and status codes
- Formatted timestamps in 12-hour format with AM/PM

**Data Access Layer**
- Storage interface pattern (`IStorage` in `server/storage.ts`) providing abstraction over database operations
- Methods for complete CRUD operations on all entities: owners, shops, tenants, leases, rent invoices, payments, bank deposits, expenses, and settings
- Supports complex queries including search, filtering by relationships, and status updates

**Build & Deployment Strategy**
- esbuild for server bundling with selective dependency bundling (allowlist approach)
- Vite for client bundling with optimized production builds
- Separate build outputs: client to `dist/public`, server to `dist/index.cjs`
- Production mode runs compiled server, development mode uses tsx with hot reload

### Database Architecture

**ORM & Schema Management**
- Drizzle ORM with PostgreSQL dialect
- Neon serverless PostgreSQL via `@neondatabase/serverless` with WebSocket support
- Schema defined in `shared/schema.ts` with Drizzle Zod integration for validation
- Migration management via `drizzle-kit push` command

**Entity Relationships**
- **Owners** → one-to-many → **Shops** (for sole ownership)
- **Owners** → one-to-many → **Expenses** (owner-specific costs)
- **Owners** → one-to-many → **Bank Deposits** (payment allocations)
- **Shops** → one-to-many → **Leases**
- **Tenants** → one-to-many → **Leases**
- **Leases** → one-to-many → **Rent Invoices**
- **Leases** → one-to-many → **Payments**
- **Tenants** → one-to-many → **Payments** (direct relationship for tracking)

**Key Database Features**
- PostgreSQL enums for floor levels, shop status, ownership type, lease status, expense types
- Decimal precision for financial amounts
- Timestamp tracking for all transactional records
- Support for common ownership (shops shared among all 5 owners)

### Key Business Logic Features

**Dual Currency Support**
- Primary currency: BDT (Bangladeshi Taka)
- Secondary display: AUD (Australian Dollar) with configurable exchange rate
- Currency toggle in UI header with real-time conversion

**Multi-Owner Revenue Allocation**
- Shops marked as "common" ownership have revenue shared among all 5 owners
- Shops marked as "sole" ownership linked to individual owner
- Expense allocation system supporting owner-specific and common expenses

**Lease & Rent Management**
- Lease statuses: active, expiring_soon (30-day alert), expired, terminated
- Monthly rent invoice generation
- Payment tracking with association to specific invoices
- Opening due balance support for tenants with pre-existing debt

**Advanced Search System**
- Global search bar accessible from header (keyboard shortcut: Cmd/Ctrl + K)
- Multi-entity search: tenants (name, phone, NID), shops (number, floor), leases (ID)
- Real-time search results with direct navigation to detail pages

**Reporting & Analytics**
- Dashboard with KPI cards: total dues, monthly collection, occupancy rates
- Financial trend charts using Recharts library
- Owner-specific financial reports with shop-wise breakdown
- Export functionality to Excel/CSV formats
- Tenant debtor tracking with aging analysis

## External Dependencies

### Database & Infrastructure
- **Neon Serverless PostgreSQL**: Primary database with WebSocket connection support
- **Drizzle ORM**: Type-safe database queries and schema management
- **connect-pg-simple**: PostgreSQL session store (if session management is added)

### UI Component Libraries
- **Radix UI**: Unstyled, accessible component primitives (accordion, dialog, dropdown, select, etc.)
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **Recharts**: Chart library for financial visualizations and trend analysis
- **Embla Carousel**: Carousel/slider functionality
- **cmdk**: Command palette component for global search

### Validation & Type Safety
- **Zod**: Runtime type validation for forms and API requests
- **Drizzle Zod**: Schema-to-Zod validation generation
- **@hookform/resolvers**: Zod integration for React Hook Form

### Utilities & Helpers
- **date-fns**: Date manipulation and formatting
- **class-variance-authority**: Type-safe component variant management
- **clsx + tailwind-merge**: Conditional className merging
- **nanoid**: Unique ID generation

### Development Tools
- **Vite**: Frontend build tool with HMR
- **esbuild**: Server-side bundling
- **tsx**: TypeScript execution for development
- **Replit plugins**: Runtime error overlay, cartographer, dev banner

### Fonts
- **Google Fonts**: Inter font family for all text (variable weights 100-900)