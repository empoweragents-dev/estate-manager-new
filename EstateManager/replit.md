# Bhuiyan & Subedari Estate Manager

## Overview

Bhuiyan & Subedari Estate Manager is a commercial property management system designed to manage "Haji Ahsan Ullah Bhuiyan Market & Subedari" - a multi-owner commercial building with 3 floors (Ground, 1st, 2nd) and 5 distinct owners. The system handles shop ownership (both sole and common), tenant management, lease tracking, financial operations including rent collection, expenses, and owner statements with support for dual-currency display (BDT/AUD).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript using Vite as the build tool

**Routing**: Wouter for client-side routing with a single-page application structure

**State Management**:
- TanStack Query (React Query) for server state management with aggressive caching (`staleTime: Infinity`)
- Zustand for client-side state (currency preferences)
- React Hook Form for form state management with Zod validation

**UI Component System**: 
- Shadcn/ui components (New York variant) built on Radix UI primitives
- Tailwind CSS for styling with custom design tokens
- Inter font family via Google Fonts
- Custom theme system with light/dark mode support

**Design Philosophy**: Modern enterprise dashboard following Linear/Stripe-inspired design system with emphasis on:
- Information hierarchy for data-heavy operations
- Operational efficiency (minimal clicks for common tasks)
- Professional credibility for financial operations
- Tabular numbers for financial displays

### Backend Architecture

**Server**: Express.js with TypeScript running on Node.js

**API Design**: RESTful API structure with routes organized in `/api/*` namespace

**Request Handling**:
- JSON body parsing with raw body preservation for webhook support
- URL-encoded form data support
- Custom logging middleware tracking response times and status codes

**Data Access Layer**: Storage interface pattern providing abstraction over database operations with methods for CRUD operations on all entity types (owners, shops, tenants, leases, payments, expenses, bank deposits)

**Build Strategy**: 
- esbuild for server bundling with selective dependency bundling (allowlist approach)
- Separate client and server builds
- Production optimization with external dependencies for faster cold starts

### Data Storage

**Database**: PostgreSQL accessed via Neon serverless driver with WebSocket support

**ORM**: Drizzle ORM with:
- Type-safe schema definitions
- Zod integration for runtime validation
- Automatic TypeScript type inference
- Migration support via drizzle-kit

**Schema Design**:
- **Owners**: 5 distinct profiles with banking information
- **Shops**: Tagged as sole-owner or common ownership, status tracking (vacant/occupied), floor-based organization
- **Tenants**: Complete profiles with NID/Passport, contact info, opening due balance support
- **Leases**: Agreement tracking with dates, security deposits, monthly rent, status (active/expiring_soon/expired/terminated)
- **Rent Invoices**: Monthly invoice generation linked to leases
- **Payments**: Payment tracking with date and amount
- **Bank Deposits**: Owner-specific deposit records
- **Expenses**: Categorized expenses with allocation to specific owners or common pool
- **Settings**: Application-wide configuration (exchange rates, etc.)

**Key Data Relationships**:
- Shops -> Owners (nullable for common ownership)
- Leases -> Shops + Tenants (many-to-one relationships)
- Payments -> Leases
- Bank Deposits -> Owners
- Expenses -> Owners (nullable for common expenses)

### External Dependencies

**UI Libraries**:
- Radix UI primitives (@radix-ui/react-*) for accessible component foundations
- Recharts for data visualization (area charts, bar charts, pie charts)
- Lucide React for icons
- Embla Carousel for carousel functionality
- CMDK for command palette

**Validation & Forms**:
- Zod for schema validation
- React Hook Form with Zod resolver
- Drizzle-Zod for automatic schema-to-Zod conversion

**Styling**:
- Tailwind CSS with PostCSS and Autoprefixer
- Class Variance Authority (CVA) for component variants
- clsx + tailwind-merge for className composition

**Date Handling**:
- date-fns for date manipulation and formatting

**Database**:
- @neondatabase/serverless for PostgreSQL connection
- Drizzle ORM for queries
- ws (WebSocket) for Neon database connections
- connect-pg-simple for session storage (not currently active but available)

**Development Tools**:
- @replit/vite-plugin-* for Replit-specific development features
- TSX for TypeScript execution
- Vite dev server with HMR

**Key Architectural Decisions**:

1. **Dual Currency Support**: BDT as primary currency with AUD as secondary view using manual exchange rate configuration
2. **Route Ordering**: Express routes with path parameters (e.g., `/api/tenants/:id`) must be defined AFTER specific path routes (e.g., `/api/tenants/by-owner`) to avoid path parameter matching before specific routes
3. **Multi-Owner Revenue Sharing**: Common shops distribute revenue across all 5 owners; sole shops route to specific owners
4. **Global Search**: Cross-entity search (tenants, shops, leases) accessible via header search bar with keyboard shortcut (Cmd/Ctrl+K)
5. **Opening Balance Support**: Tenants can have pre-existing debt recorded during onboarding
6. **Lease Lifecycle Management**: Automatic status tracking with 30-day expiring soon alerts, detailed lease view with monthly rent breakdown, payment history, tenant expenses, and termination module with settlement summary
7. **Financial Reporting**: Owner-specific statements showing rent collected, common shop shares, allocated expenses, and net payouts. Owner-Tenant Details Report with PDF export showing all tenants with current/previous dues, payment history, and summary totals
8. **Separation of Concerns**: Storage layer abstracts database operations from route handlers for testability and maintainability
9. **Aggressive Client Caching**: React Query configured with infinite stale time to minimize unnecessary refetches during active sessions
10. **Shop Sorting Order**: All shop/tenant listings are sorted by:
    - Floor order: Ground Floor → 1st Floor → 2nd Floor → Subedari
    - Within each floor, by prefix: E (East) → M (Middle) → W (West)
    - Within each prefix, numerically: E-1, E-6, E-7, then M-3, M-6, then W-1, W-4, etc.
11. **User Roles & Authentication**: Traditional username/password authentication with two roles - Super Admin (full access) and Owner (filtered access to their data + common spaces)

### Authentication & Authorization

**Authentication System**: Traditional Username/Password with bcrypt
- Login via POST `/api/login` with username and password
- Passwords hashed with bcrypt (10 salt rounds) before storage
- Session management with PostgreSQL session store (connect-pg-simple)
- Session secret stored in environment variables (SESSION_SECRET)

**User Roles**:
1. **Super Admin**: Full access to all data, user management, owner management, system settings
2. **Owner**: Filtered access to only their shops, tenants, leases, and financial data + common spaces

**Super Admin Account**:
- Username from environment variable SUPER_ADMIN_USERNAME (default: "super_admin")
- Password from environment variable SUPER_ADMIN_PASSWORD (required)
- Created automatically on first server startup if not exists
- Protected from deletion

**Owner Accounts**:
- Created by Super Admin through User Management page (/admin/users)
- Each owner account can be linked to an Owner entity for data filtering
- Passwords set by Super Admin, hashed with bcrypt

**Database Tables for Auth**:
- `sessions`: PostgreSQL session storage for authentication
- `users`: User accounts with username, hashed password, role (super_admin/owner), ownerId link, profile information

**Authorization Middleware** (server/auth.ts):
- `isAuthenticated`: Validates user session
- `requireSuperAdmin`: Ensures user has super_admin role
- `requireOwnerOrAdmin`: Allows both super_admin and owner roles

**Client-Side Auth** (hooks/useAuth.ts):
- `useAuth` hook provides: user, isAuthenticated, isLoading, isSuperAdmin, isOwner
- Role-based sidebar navigation showing/hiding menu items
- User menu with profile info and logout

**Key Auth Routes**:
- `POST /api/login` - Login with username and password
- `POST /api/logout` - Ends session and logs out
- `GET /api/auth/user` - Returns current authenticated user with role info
- `GET /api/users` - (Super Admin only) List all users
- `POST /api/users` - (Super Admin only) Create new owner account
- `PATCH /api/users/:id` - (Super Admin only) Update user account
- `DELETE /api/users/:id` - (Super Admin only) Delete user account

**Environment Variables Required**:
- `SESSION_SECRET` - Secret key for session encryption
- `SUPER_ADMIN_PASSWORD` - Password for Super Admin account (required)
- `SUPER_ADMIN_USERNAME` - Username for Super Admin account (optional, defaults to "super_admin")