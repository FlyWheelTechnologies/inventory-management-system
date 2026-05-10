# 🧠 Flywheel Technologies — Project Knowledge Base
### Client: **FlorzyAngel Enterprise** — Enterprise Management System
> **Last Updated:** 2026-05-10 | **Maintained by:** Flywheel Technologies

---

## 📌 Project Overview

This repo is a **cloned React + Vite inventory management template** being transformed into a **production-ready, white-labeled inventory system** for a hardware store client. The goal is full ownership of every line of code — customized UX, branded communications, and AI-ready architecture.

**Client Business Context:**
- Hardware store dealing in building materials (cement bags, iron rods, etc.)
- Needs to handle **buying in bulk (tons/bags) and selling in pieces/units**
- Has **contractors who buy on credit** — debt tracking is critical
- Owner needs to monitor sales remotely (WhatsApp alerts + email digests)
- Staff (attendants) must not be able to delete or reverse sales records

---

## 🗂️ Current Repo State (Baseline Audit)

### Stack as Cloned (Modified for Local Dev)
| Layer | Technology |
|---|---|
| Frontend Framework | React 19 + Vite 7 |
| Backend (Local) | **Node.js + Express** |
| Database (Local) | **SQLite** (`server/inventory.db`) |
| Auth | Custom JWT + Bcrypt (Local) |
| Proxy | `supabaseClient.js` mapped to local API |
| Styling | Plain CSS + Inter Font |

### Pages (Existing)
| Route | Component | Status |
|---|---|---|
| `/` | `Login.jsx` | ✅ Exists |
| `/signup` | `Signup.jsx` | ✅ Exists |
| `/dashboard` | `Dashboard.jsx` | ✅ Exists — needs customization |
| `/products` | `Products.jsx` | ✅ Exists — needs UOM logic |
| `/sales` | `Sales.jsx` | ✅ Exists — needs payment_status field |

### Key Files
- `client/src/services/supabaseClient.js` — Supabase connection client
- `client/src/context/AuthContext.jsx` — Auth state provider
- `client/src/components/ProtectedRoute.jsx` — Route guard

---

## 🏗️ Target Architecture (Production)

> **✅ CURRENT STATE:** Running **Node.js + Express + SQLite** locally.
> Migration to Supabase (managed Postgres + Auth) is planned for later.
> For now, all data is stored in `server/inventory.db`.

```
┌─────────────────────────────────────────────────────────┐
│                   Local Environment                     │
│                                                         │
│  ┌──────────────┐       ┌────────────────────────┐      │
│  │   Vite Dev   │ ────▶ │   Express API Server   │      │
│  │   (Port 5173)│       │   (Port 5000)          │      │
│  └──────────────┘       └────────────────────────┘      │
│                                     │                   │
│                                     ▼                   │
│                          ┌────────────────────────┐     │
│                          │   SQLite Database      │     │
│                          │   (inventory.db)       │     │
│                          └────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
         ↑ GitHub Actions / Vercel Deployments (TBD)

**Domain:** `florzyangel.bookflywheel.com` (Subdomain TBD)
**Hosting:** GitHub Pages or Vercel (TBD)

---

## 🔧 Implementation Phases

### Phase 1 — Foundation & Migration
- [ ] Decide: Supabase vs. self-hosted Postgres (see open questions)
- [ ] If migrating: replace `supabaseClient.js` with a Next.js API route + `pg` or `prisma` connection
- [ ] Set up `docker-compose.yml` with 3 services (Next.js, PostgreSQL, Nginx)
- [ ] Configure environment variables (`.env.local` for dev, Docker secrets for prod)
- [ ] Point domain to Hetzner VPS via DNS

### Phase 2 — Hardware Store Logic Layer ("The Fixes")
- [ ] **UOM Conversions** — DB schema support for buying unit vs. selling unit
  - Example: Product bought in `tons`, sold in `bags` (1 ton = 20 bags of Ghacem)
  - Add `buying_uom`, `selling_uom`, `conversion_factor` columns to products table
- [ ] **Role-Based Access Control (RBAC)**
  - Roles: `owner`, `manager`, `attendant`
  - Attendants: can create sales, cannot delete or edit past records
  - Implement with NextAuth.js or Supabase RLS (Row Level Security)
- [ ] **Debt / Credit Tracking**
  - Add `payment_status` column to transactions: `PAID | PARTIAL | CREDIT`
  - Add `amount_paid` and `balance_due` fields
  - Build a "Debtors" view filtered by contractors with outstanding balances
- [ ] **Double-Entry Accounting Guard**
  - Every sale must balance: `Cash In` = `Items Sold × Price`
  - Prevent stock going negative without a corresponding transaction record

### Phase 3 — Notifications Layer
- [ ] **WhatsApp Alerts (Twilio or Hubtel)**
  - Fire on: sale submitted, low stock threshold hit
  - Customer receipt format: `"Hi [Name], your receipt for [X bags of Ghacem]..."`
  - Owner alert for large sales or critical stock levels
- [ ] **Email Notifications (Resend or Nodemailer)**
  - Daily 6:00 PM digest: total sales, top products, outstanding debts
  - PDF invoice generation (`react-pdf`) for contractor orders
  - Branded with Flywheel Technologies signature in footer
- [ ] **Cron Job Setup** — VPS-level cron or `node-cron` inside Next.js

### Phase 4 — UI Overhaul (Flywheel Brand)
- [ ] Apply glassmorphism design system (dark mode, frosted glass cards)
- [ ] Google Fonts: `Inter` or `Outfit`
- [ ] Smooth animations and hover micro-interactions
- [ ] Replace all generic template colors with client-specific palette
- [ ] Mobile-responsive layout (store attendants may use phones)

### Phase 5 — AI Integration (Future / V2)
- [ ] Gemini/OpenAI summarization layer on daily digest emails
  - Example: *"Today was great! You sold 20% more iron rods than last Tuesday..."*
- [ ] WhatsApp bot via Twilio Conversations for owner queries (`"What's my stock level?"`)
- [ ] Analytics dashboard with trend predictions

---

## 🗄️ Database Schema (Draft)

```sql
-- Products table with UOM support
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  buying_uom TEXT NOT NULL,       -- e.g., 'ton', 'bag', 'piece'
  selling_uom TEXT NOT NULL,      -- e.g., 'bag', 'piece', 'length'
  conversion_factor NUMERIC,      -- buying_uom → selling_uom multiplier
  cost_price NUMERIC NOT NULL,
  selling_price NUMERIC NOT NULL,
  stock_quantity NUMERIC NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Customers / Contractors
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  is_contractor BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sales transactions with debt tracking
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  attendant_id UUID,              -- user who recorded the sale
  total_amount NUMERIC NOT NULL,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  balance_due NUMERIC GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  payment_status TEXT CHECK (payment_status IN ('PAID', 'PARTIAL', 'CREDIT')) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sale line items
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  subtotal NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- User roles
CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY,
  role TEXT CHECK (role IN ('owner', 'manager', 'attendant')) NOT NULL DEFAULT 'attendant'
);
```

---

## 🐳 Docker Setup (For Your Friend)

```yaml
# docker-compose.yml (template — to be completed)
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    restart: unless-stopped

  nginx:
    image: 'jc21/nginx-proxy-manager:latest'
    ports:
      - "80:80"
      - "443:443"
      - "81:81"   # Admin UI
    volumes:
      - nginx_data:/data
      - letsencrypt:/etc/letsencrypt
    restart: unless-stopped

volumes:
  postgres_data:
  nginx_data:
  letsencrypt:
```

**Backup Script (daily pg_dump → Google Drive):**
```bash
#!/bin/bash
# /scripts/backup.sh — run via cron: 0 2 * * *
DATE=$(date +%Y-%m-%d)
BACKUP_FILE="herstore_backup_$DATE.sql"
pg_dump $DATABASE_URL > /backups/$BACKUP_FILE
# Upload to Google Drive using rclone (configured separately)
rclone copy /backups/$BACKUP_FILE gdrive:HerStore/Backups/
```

---

## 🔐 Environment Variables (`.env` template)

```env
# Database
POSTGRES_DB=herstore
POSTGRES_USER=flywheel
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD
DATABASE_URL=postgresql://flywheel:CHANGE_ME@db:5432/herstore

# Auth (NextAuth.js)
NEXTAUTH_SECRET=CHANGE_ME_RANDOM_SECRET
NEXTAUTH_URL=https://inventory.herstore.com

# WhatsApp (choose one)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
# OR
HUBTEL_CLIENT_ID=
HUBTEL_CLIENT_SECRET=

# Email
RESEND_API_KEY=

# AI (Phase 2)
GEMINI_API_KEY=
```

---

## ✅ Confirmed Decisions

| # | Decision | Answer |
|---|---|---|
| 1 | **Backend** | ✅ Keep **Supabase** (managed Postgres + Auth + RLS) |
| 2 | **Client name** | ✅ **FlorzyAngel Enterprise** |
| 3 | **Staff count & roles** | ✅ Max 3: **Admin**, **Storekeeper**, **Auditor** |
| 4 | **Offline support** | ✅ **Yes — aggressive offline-first** (PWA + IndexedDB sync queue) |
| 5 | **Approach** | ✅ One phase at a time |
| 6 | **Currency** | GHS (Ghana Cedis) — assumed, confirm if needed |

---

## 👥 Role Definitions (RBAC)

| Role | Can Do | Cannot Do |
|---|---|---|
| **Admin** | Everything — full CRUD, user management, reports, delete records | — |
| **Storekeeper** | Add stock, record sales, view dashboard | Delete past records, manage users, view financial reports |
| **Auditor** | View all records, export reports, view debt ledger | Create/edit/delete any record |

**Implementation:** Supabase Row Level Security (RLS) policies enforce this at the DB level. Role stored in `user_roles` table and checked in Supabase RLS policies.

---

## 📱 Offline-First Strategy

**Approach:** PWA (Progressive Web App) with IndexedDB as a local queue.

```
Attendant records a sale (offline)
        ↓
Sale saved to IndexedDB locally
        ↓
Service Worker detects connectivity restored
        ↓
Sync queue flushes to Supabase
        ↓
Conflict resolution: server timestamp wins
```

**Key Libraries:**
- `workbox` — Service Worker + caching strategy
- `idb` or `Dexie.js` — IndexedDB wrapper for offline queue
- Supabase Realtime — sync indicator when back online

**Vite PWA Plugin:** `vite-plugin-pwa` — adds manifest + service worker to the existing Vite setup without migrating to Next.js.

---

## 🎨 UI Design Reference (Target)

Based on the reference screenshot of "Flywheel Hardware Management Suite":

### Layout
- **Left sidebar** (collapsible): Dashboard, Stock (expandable), Sales (expandable), Accounting (expandable)
- **Top header**: App name + notification bell + user avatar with role name
- **Main content**: `Inventory at a Glance` section + Quick Actions panel (right)
- **Stock Balance table** below KPI cards

### Color Palette
- Background: `#f5f6fa` (light gray page bg)
- Sidebar: White with `#2563eb` (blue) active state
- Cards: White with subtle shadow
- Accent: `#2563eb` (primary blue) for buttons and highlights
- Warning: Amber/orange for low stock alerts
- Success: Green for positive trends

### Key UI Components to Build
| Component | Description |
|---|---|
| `Sidebar` | Collapsible nav with nested menus, hamburger toggle |
| `StatCard` | KPI card — icon, label, value, trend indicator |
| `SparklineChart` | Dual-line mini chart (stock in green / stock out red) |
| `QuickActions` | Right-panel button group with icons |
| `StockTable` | Item Code, Name, Qty, Purchase UOM, Selling UOM columns |
| `UserAvatar` | Top-right with role badge (Admin/Storekeeper/Auditor) |

### Sample Data Pattern (FlorzyAngel)
| Item Code | Item Name | In Stock | Purchase UOM | Selling UOM |
|---|---|---|---|---|
| CEM001 | Cement Bag (Ghacem) | 240 Bags | Pallet | Bag |
| IRB012 | Iron Rod 12mm | 1,100 Pieces | Bundle | Piece |
| IRB013 | Iron Rod 16mm | 950 Pieces | Bundle | Piece |

---

## ❓ Remaining Open Questions

| # | Question | Why It Matters |
|---|---|---|
| 1 | **WhatsApp provider?** | Twilio (global) vs Hubtel (Ghana-native, local rates) |
| 2 | **Client's domain?** | ✅ `florzyangel.bookflywheel.com` (Subdomain TBD) |
| 3 | **Mobile or desktop primary?** | Owner on phone vs desktop influences layout breakpoints |

---

## 🚀 Quick Start (Current Cloned Repo)

```bash
# Clone and install
cd client
npm install

# Set up Supabase env (current baseline)
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Run dev server
npm run dev
```

---

## 📝 Notes & Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-05-10 | Chose custom React+Vite clone over ERPNext | Lighter VPS footprint, full UX control, AI-integration-friendly |
| 2026-05-10 | Keep Supabase (not self-hosted Postgres) | Managed auth, RLS, realtime — perfect for 3-staff system, lower ops burden |
| 2026-05-10 | Client name confirmed: FlorzyAngel Enterprise | Brand name for all UI labels, emails, and WhatsApp messages |
| 2026-05-10 | Offline-first via PWA + Dexie.js/IndexedDB | Hardware store has spotty internet — attendants must never lose a sale |
| 2026-05-10 | 3 roles: Admin, Storekeeper, Auditor | Enforced via Supabase RLS — Auditor read-only, Storekeeper no deletes |

---

*This document is a living knowledge base. Update the Decisions Log and open questions as the project evolves.*
