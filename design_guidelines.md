# Bhuiyan & Subedari Estate Manager - Design Guidelines

## Design Approach: Modern Enterprise Dashboard System

**Selected Approach**: Design System (Linear/Stripe-inspired)
**Justification**: Data-heavy property management application requiring clarity, efficiency, and professional polish for financial operations.

**Core Principles**:
- Information hierarchy: Critical data immediately scannable
- Operational efficiency: Common tasks require minimal clicks
- Professional credibility: Financial data demands trust and precision

## Typography System

**Font Stack**: Inter (Google Fonts) for entire application
- Headings: font-semibold to font-bold
- Body text: font-normal (16px base)
- Data/Numbers: font-medium with tabular-nums
- Labels: font-medium text-sm uppercase tracking-wide

**Hierarchy**:
- Page Titles: text-2xl font-semibold
- Section Headers: text-lg font-semibold
- Card Titles: text-base font-semibold
- Body/Forms: text-base
- Metadata/Labels: text-sm
- Financial Figures: text-xl to text-3xl font-semibold with tabular-nums

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, and 8
- Component padding: p-6
- Card spacing: p-4 to p-6
- Form field gaps: gap-4
- Section margins: mb-8
- Page padding: p-8

**Grid Structure**:
- Dashboard: 3-column grid (lg:grid-cols-3) for KPI cards
- Reports: 2-column split (lg:grid-cols-2) for comparative data
- Master-detail: Sidebar (w-80) + Main content (flex-1)

## Component Library

**Navigation**:
- Top header: Fixed with app logo, global search bar (center-prominent), currency toggle (BDT/AUD), user menu
- Side navigation: Persistent left sidebar with icon + label format, grouped sections (Dashboard, Properties, Tenants, Financial, Reports)

**Dashboard Cards**:
- KPI Cards: Elevated cards with large numeric display, label, and trend indicator
- List Cards: Dense rows with hover states for clickable items
- Chart Cards: Integrated data visualizations for collection reports

**Data Tables**:
- Striped rows for readability
- Sticky headers on scroll
- Status badges (pill-shaped with subtle backgrounds)
- Action column (right-aligned) with icon buttons
- Sortable columns with arrow indicators

**Forms**:
- Single-column layout (max-w-2xl) for focused input
- Grouped sections with dividers
- Inline validation messages
- Required field indicators (asterisk)
- "Opening Due Balance" field: Prominent with helper text explaining its purpose
- File upload areas: Dashed border boxes with upload icons

**Search Interface**:
- Global search: Full-width input in header with magnifying glass icon
- Instant results dropdown: Categorized results (Tenants | Shops | Leases) with metadata preview
- Result cards: Clickable with key info visible (tenant photo thumbnail, shop number, current dues)

**Financial Components**:
- Payment receipt modals: Clear breakdown of transaction details
- Ledger view: Timeline-style with alternating debit/credit entries
- Bank deposit tracker: Table with deposit slip reference field
- Currency display: BDT ৳ symbol with AUD toggle showing conversion rate

**Status Indicators**:
- Lease Status: Color-coded pills (Active, Expiring Soon with warning icon, Expired, Terminated)
- Shop Status: Badge system (Occupied, Vacant)
- Payment Status: Visual indicators (Paid in full, Partial, Outstanding with amounts)

**Reports Interface**:
- Date range picker: Dual calendar dropdown for report filtering
- Owner selector: Dropdown with owner details
- Export buttons: PDF/Excel options clearly visible
- Statement layout: Professional invoice-style with breakdown tables

**Icons**: Heroicons (via CDN) - use outline style for navigation, solid for status indicators

**Responsive Behavior**:
- Desktop-first design optimized for management workflow
- Mobile: Collapsible sidebar, stacked cards, simplified tables with expandable rows
- Tablet: 2-column grids become single column

**Images**: 
No hero images (this is a business application). Use:
- Tenant photos: Circular thumbnails (64px) in profile cards
- Empty states: Simple illustrations for vacant shops, no tenants found
- Owner avatars: Initials-based circles if no photo provided

**Accessibility**:
- All forms with proper labels and ARIA attributes
- Keyboard navigation for tables and search results
- High contrast for financial figures
- Clear focus states on all interactive elements

**Critical UI Elements**:
- "Receive Payment" button: Primary action button, always visible in active lease views
- Dues calculation display: Always-visible running total in tenant detail pages
- 30-day expiry alerts: Banner notifications on dashboard with action buttons
- Common vs Sole ownership indicator: Clear badge system on shop cards

This system prioritizes operational efficiency while maintaining professional credibility essential for financial management applications.