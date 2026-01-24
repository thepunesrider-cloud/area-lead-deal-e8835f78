# LeadsNearby Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                     │
├─────────────────────────────────────────────────────────────┤
│  Pages: Dashboard, GetLeads, Profile, Admin, History, etc.  │
│  Components: Cards, Modals, Forms, Navigation               │
│  Hooks: useAuth, useLanguage, useToast, useMobile          │
└────────────────┬────────────────────────────────────────────┘
                 │
         ┌───────▼────────┐
         │  Context API   │
         ├────────────────┤
         │ • Auth Context │
         │ • Language i18n│
         │ • User Profile │
         └───────┬────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───▼──┐   ┌─────▼────┐  ┌───▼──────┐
│ Libs │   │Components│  │Utilities │
├──────┤   ├──────────┤  ├──────────┤
│•Auth │   │•Rating   │  │•Filters  │
│•Leads│   │•Notif    │  │•Export   │
│•Push │   │•Anim     │  │•Bulk Ops │
│•SMS  │   │•Profile  │  │•Perf     │
└──────┘   └──────────┘  └──────────┘
    │            │            │
    └────────────┼────────────┘
                 │
    ┌────────────▼────────────┐
    │   Supabase Client SDK   │
    ├─────────────────────────┤
    │ • REST API (PostgREST)  │
    │ • Auth (GoTrue)         │
    │ • Storage (S3-like)     │
    │ • Realtime (websocket)  │
    └────────────┬────────────┘
                 │
    ┌────────────▼────────────────────┐
    │   Supabase Backend              │
    ├─────────────────────────────────┤
    │ Database (PostgreSQL)           │
    │ ├─ profiles                     │
    │ ├─ leads                        │
    │ ├─ ratings                      │
    │ ├─ notifications                │
    │ ├─ payments                     │
    │ └─ user_preferences             │
    │                                 │
    │ Edge Functions (Deno)           │
    │ ├─ send-lead-notification       │
    │ ├─ send-sms-notification        │
    │ ├─ razorpay-webhook             │
    │ ├─ msg91-webhook                │
    │ └─ whatsapp-webhook             │
    │                                 │
    │ Storage (S3)                    │
    │ └─ lead-proofs, avatars, etc.   │
    └─────────────────────────────────┘
```

---

## Data Flow Diagram

### Lead Creation Flow
```
User → Generate Lead Page
   ↓
   → Validate Input (client-side)
   ↓
   → Create Lead (Supabase REST API)
   ↓
   → Trigger send-lead-notification Function
   ↓
   → Query nearby users (distance calculation)
   ↓
   → Send WhatsApp via MSG91
   ↓
   → Send SMS via MSG91
   ↓
   → Create in-app notifications
   ↓
   → Update user dashboard
```

### Lead Claiming Flow
```
Provider → Get Leads Page
   ↓
   → Apply Filters & Search
   ↓
   → View filtered leads
   ↓
   → Click Claim Lead
   ↓
   → Update lead status to 'claimed'
   ↓
   → Notify lead generator
   ↓
   → Show provider profile to generator
   ↓
   → Enable chat between users
```

### Lead Completion & Rating Flow
```
Provider → Lead Details Page
   ↓
   → Upload Proof Image
   ↓
   → Mark as Complete
   ↓
   → Trigger send-lead-notification
   ↓
   → Notify generator
   ↓
   Generator views lead
   ↓
   → Rating Modal Auto-Opens
   ↓
   → Rate Provider (1-5 stars)
   ↓
   → Save rating to database
   ↓
   → Update provider's average rating
   ↓
   → Redirect to history
```

---

## Database Schema

### Core Tables

```sql
-- Users Profile
profiles
├─ id (UUID, PK)
├─ name (TEXT)
├─ phone (TEXT)
├─ avatar_url (TEXT)
├─ location_lat (DOUBLE)
├─ location_long (DOUBLE)
├─ service_radius_km (INT)
├─ service_type (ENUM)
├─ is_subscribed (BOOL)
├─ subscription_expires_at (TIMESTAMP)
└─ created_at, updated_at

-- Leads
leads
├─ id (UUID, PK)
├─ service_type (ENUM)
├─ location_lat (DOUBLE)
├─ location_long (DOUBLE)
├─ location_address (TEXT)
├─ customer_name (TEXT)
├─ customer_phone (TEXT)
├─ status (ENUM: open, claimed, completed, rejected)
├─ created_by_user_id (UUID, FK)
├─ claimed_by_user_id (UUID, FK)
├─ claimed_at (TIMESTAMP)
├─ completed_at (TIMESTAMP)
├─ proof_url (TEXT)
└─ created_at

-- Ratings
ratings
├─ id (UUID, PK)
├─ lead_id (UUID, FK)
├─ rater_id (UUID, FK)
├─ rated_user_id (UUID, FK)
├─ rating (INT: 1-5)
├─ comment (TEXT)
└─ created_at

-- Notifications
notifications
├─ id (UUID, PK)
├─ user_id (UUID, FK)
├─ type (TEXT)
├─ title (TEXT)
├─ body (TEXT)
├─ data (JSONB)
└─ created_at

-- User Preferences
user_preferences
├─ user_id (UUID, PK)
├─ notification_preferences (JSONB)
├─ theme (TEXT)
├─ language (TEXT)
└─ updated_at

-- Push Tokens
push_tokens
├─ id (UUID, PK)
├─ user_id (UUID, FK)
├─ subscription (JSONB)
└─ created_at

-- Payments
payments
├─ id (UUID, PK)
├─ user_id (UUID, FK)
├─ amount (NUMERIC)
├─ status (TEXT)
├─ razorpay_payment_id (TEXT)
├─ type (TEXT: subscription, lead_fee)
└─ created_at
```

---

## File Structure

```
src/
├─ pages/
│  ├─ Index.tsx               (Landing)
│  ├─ Auth.tsx                (Login/Register)
│  ├─ Dashboard.tsx           (User Dashboard)
│  ├─ GenerateLead.tsx        (Create Lead)
│  ├─ GetLeads.tsx            (Find Leads)
│  ├─ LeadDetails.tsx         (Lead Info + Rating)
│  ├─ History.tsx             (User History)
│  ├─ Profile.tsx             (User Settings)
│  ├─ Admin.tsx               (Admin Panel)
│  ├─ AdminDashboard.tsx      (Analytics NEW)
│  ├─ Subscribe.tsx           (Subscription)
│  ├─ Community.tsx           (Community)
│  ├─ Notifications.tsx       (Alerts)
│  ├─ PrivacyPolicy.tsx       (Legal)
│  ├─ TermsOfService.tsx      (Legal)
│  └─ NotFound.tsx            (404)
│
├─ components/
│  ├─ Header.tsx              (Navigation)
│  ├─ BottomNav.tsx           (Mobile Nav)
│  ├─ LeadCard.tsx            (Lead Display)
│  ├─ LeadFilter.tsx          (Filters)
│  ├─ RatingModal.tsx         (5-star Rating)
│  ├─ UserProfileModal.tsx    (Profile View)
│  ├─ NotificationPreferences.tsx (Settings NEW)
│  ├─ Animations.tsx          (Animations NEW)
│  ├─ ui/                     (Shadcn Components)
│  │  ├─ button.tsx
│  │  ├─ card.tsx
│  │  ├─ dialog.tsx
│  │  ├─ input.tsx
│  │  ├─ textarea.tsx
│  │  ├─ badge.tsx
│  │  ├─ switch.tsx
│  │  └─ (many more...)
│  └─ (other components)
│
├─ lib/
│  ├─ utils.ts                (Utilities)
│  ├─ lead-actions.ts         (Lead Operations)
│  ├─ whatsapp.ts             (WhatsApp Integration)
│  ├─ notifications.ts        (Notification Logic)
│  ├─ auto-rejection.ts       (Auto Expire Leads)
│  ├─ push-notifications.ts   (Push Notifs NEW)
│  ├─ sms-notifications.ts    (SMS Integration NEW)
│  ├─ advanced-filtering.ts   (Filters & Search NEW)
│  ├─ export-reports.ts       (Reports & Export NEW)
│  ├─ bulk-operations.ts      (Bulk Admin Ops NEW)
│  └─ performance-optimization.ts (Performance NEW)
│
├─ contexts/
│  ├─ AuthContext.tsx         (User Auth)
│  └─ LanguageContext.tsx     (i18n)
│
├─ hooks/
│  ├─ use-mobile.tsx          (Responsive)
│  └─ use-toast.ts            (Notifications)
│
├─ integrations/
│  └─ supabase/
│     └─ client.ts            (Supabase Init)
│
├─ App.tsx                    (Main Router)
├─ main.tsx                   (Entry Point)
├─ index.css                  (Global Styles)
└─ vite-env.d.ts              (Vite Types)

public/
├─ sw.js                      (Service Worker NEW)
├─ icon-192x192.png           (PWA Icon)
├─ badge-72x72.png            (PWA Badge)
└─ robots.txt                 (SEO)

supabase/
├─ config.toml                (Supabase Config)
├─ functions/
│  ├─ send-lead-notification/ (Lead Alerts)
│  ├─ send-sms-notification/  (SMS Integration NEW)
│  ├─ razorpay-webhook/       (Payment Webhook)
│  ├─ msg91-webhook/          (SMS Webhook)
│  └─ (other functions)
└─ migrations/                (Database Migrations)
```

---

## Technology Stack

### Frontend
- **React 18** - UI Library
- **TypeScript** - Type Safety
- **Vite** - Build Tool
- **React Router** - Navigation
- **Shadcn/ui** - Component Library
- **Tailwind CSS** - Styling
- **Lucide Icons** - Icons
- **React Query** - Data Fetching
- **Recharts** - Charts & Graphs
- **Date-fns** - Date Utilities
- **Embla Carousel** - Carousel

### Backend
- **Supabase** - Backend as a Service
- **PostgreSQL** - Database
- **PostgREST** - REST API
- **Deno** - Edge Functions Runtime
- **GoTrue** - Authentication
- **S3-like Storage** - File Storage

### External Services
- **MSG91** - SMS & WhatsApp
- **Razorpay** - Payments
- **Google Maps** - Location
- **Service Workers** - Push Notifications

### DevOps
- **Vite** - Development Server
- **npm** - Package Manager
- **Git** - Version Control
- **GitHub** - Code Repository

---

## Authentication Flow

```
┌─────────┐
│ Login   │
└────┬────┘
     │
     ▼
┌──────────────────────────┐
│ Supabase GoTrue          │
│ (Email + Password)       │
└────┬─────────────────────┘
     │
     ▼
┌──────────────────────────┐
│ Session Token Generated  │
│ (JWT in localStorage)    │
└────┬─────────────────────┘
     │
     ▼
┌──────────────────────────┐
│ User Profile Created     │
│ (profiles table)         │
└────┬─────────────────────┘
     │
     ▼
┌──────────────────────────┐
│ Redirect to Onboarding   │
│ or Dashboard             │
└──────────────────────────┘
```

---

## Security Features

### Row Level Security (RLS)
- Users can only view/edit own data
- Admins have elevated permissions
- Service role for backend operations

### Encryption
- All connections via HTTPS
- JWT tokens for API auth
- Password hashing via GoTrue

### Data Validation
- Client-side input validation
- Server-side type checking
- SQL injection prevention (ORM)

### Rate Limiting
- API rate limits via Supabase
- Function invocation limits
- SMS sending limits

---

## Performance Optimizations

### Frontend
- Code splitting with React.lazy
- Image optimization (70% reduction)
- Virtual scrolling for lists
- Debounce/throttle for inputs
- Cache with TTL

### Backend
- Database indexes on common queries
- Connection pooling
- Edge functions for low latency
- Efficient distance calculations (Haversine)

### Network
- Gzip compression
- CDN for static assets
- Lazy loading images
- Prefetch critical resources

---

## Monitoring & Analytics

### Metrics Tracked
- User engagement (DAU, MAU)
- Lead success rate
- Average processing time
- Revenue metrics
- Error rates

### Logging
- Browser console logs
- Supabase function logs
- Error tracking
- User actions

---

## Deployment Strategy

### Development
- `npm run dev` - Local development server
- Hot module replacement (HMR)
- Mock data for testing

### Staging
- `npm run build` - Production build
- Environment variables in .env.staging
- Test with real backend

### Production
- Deploy to Vercel/Netlify
- Environment variables in .env.production
- Monitoring & alerts enabled

---

## Future Architecture Enhancements

1. **WebSocket** - Real-time updates
2. **GraphQL** - Flexible queries
3. **Microservices** - Scalable backend
4. **Message Queue** - Async jobs
5. **Caching Layer** - Redis
6. **ML Pipeline** - Recommendations

---

**Last Updated**: January 23, 2026
**Architecture Version**: 2.0.0
