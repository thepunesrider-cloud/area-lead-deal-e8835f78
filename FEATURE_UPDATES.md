# LeadsNearby - Feature Updates Summary

## Changes Implemented (January 15, 2026)

### 1. Accept/Reject Lead Functionality ✅

#### For Lead Generator (Person who posted the lead):
- **New Feature**: "Get Back Lead" button added on lead detail page
- Can now retrieve a claimed lead from an agent who hasn't completed it
- Lead returns to "open" status and becomes available for others to claim
- Agents are notified when a lead is retrieved

#### For Agent (Person who claimed the lead):
- **Existing Feature Enhanced**: "Reject/Cancel" button functionality maintained
- Can release a claimed lead back to open status
- Lead generators are notified when their lead is rejected

**Files Modified:**
- `src/pages/LeadDetails.tsx` - Added UI buttons and logic for both roles
- `src/lib/lead-actions.ts` - Existing rejection logic works for both scenarios

---

### 2. 3-Day Auto-Rejection for Incomplete Leads ✅

#### Automatic Lead Expiration System:
- **Rule**: If a lead is claimed but not completed within 3 days, it automatically becomes available again
- **Status Change**: Lead reverts from "claimed" to "open"
- **Notifications**: Both lead generator and agent receive notifications about the auto-rejection

#### Implementation Details:

**Database Migration:**
- File: `supabase/migrations/20260115000000_add_auto_rejection_feature.sql`
- Creates database function `auto_reject_expired_leads()`
- Adds performance index for claimed leads

**Edge Function (Server-side):**
- Location: `supabase/functions/auto-reject-leads/`
- Should be triggered daily via cron job
- Processes all expired leads in batch
- See README in function folder for deployment instructions

**Client-side Backup:**
- File: `src/lib/auto-rejection.ts` - Utility functions
- File: `src/App.tsx` - Runs check on app startup and every hour
- Ensures leads are processed even if cron job fails

**Visual Indicators:**
- Expiry warnings shown on lead detail page
- Days remaining countdown displayed
- Warning badge on history page for leads about to expire
- Red alert for leads expiring within 1 day

**Files Created:**
```
supabase/migrations/20260115000000_add_auto_rejection_feature.sql
supabase/functions/auto-reject-leads/index.ts
supabase/functions/auto-reject-leads/README.md
src/lib/auto-rejection.ts
```

**Files Modified:**
```
src/App.tsx
src/pages/LeadDetails.tsx
src/pages/History.tsx
```

---

### 3. Payment Phone Number Update ✅

**Changed from:** 9999999999  
**Changed to:** 8766759346

**Files Updated:**
- `src/pages/GetLeads.tsx` - Subscribe modal WhatsApp link
- `src/pages/Subscribe.tsx` - Already had correct number

---

## Deployment Instructions

### 1. Database Migration
```bash
# Apply the new migration
supabase db push
```

### 2. Edge Function Deployment
```bash
# Deploy the auto-reject function
supabase functions deploy auto-reject-leads
```

### 3. Set Up Cron Job
Choose one of these options:

**Option A: External Cron Service (Recommended)**
- Use cron-job.org or similar
- Schedule: Daily at midnight
- URL: `https://your-project-ref.supabase.co/functions/v1/auto-reject-leads`
- Header: `Authorization: Bearer YOUR_ANON_KEY`

**Option B: GitHub Actions**
- Create `.github/workflows/auto-reject-leads.yml`
- See edge function README for template

### 4. Build and Deploy Frontend
```bash
npm run build
# Deploy to your hosting platform
```

---

## Testing Checklist

### Lead Generator Features:
- [ ] Post a new lead
- [ ] View lead details after someone claims it
- [ ] Click "Get Back Lead" button
- [ ] Verify lead returns to open status
- [ ] Check notification sent to agent

### Agent Features:
- [ ] Claim a lead
- [ ] Click "Reject/Cancel" button
- [ ] Verify lead returns to available leads
- [ ] Check notification sent to generator

### Auto-Rejection:
- [ ] Claim a lead and wait (or manually adjust claimed_at in database for testing)
- [ ] Verify expiry warning appears on day 2-3
- [ ] Verify lead auto-releases after 3 days
- [ ] Check both parties receive notifications
- [ ] Verify lead appears in "Get Leads" section again

### Payment:
- [ ] Try to subscribe
- [ ] Verify WhatsApp opens with correct number (8766759346)

---

## Database Schema Changes

### Existing Fields Used:
- `leads.claimed_at` - Used to calculate 3-day expiry
- `leads.rejected_at` - Updated when lead is auto-rejected
- `leads.claimed_by_user_id` - Reset to NULL on rejection
- `leads.status` - Changed from 'claimed' to 'open'

### New Indexes:
- `idx_leads_claimed_status` - Improves query performance for auto-rejection

---

## Notifications

### New Notification Types:
1. **lead_rejected** - Agent manually rejected the lead
2. **lead_recalled** - Generator got the lead back
3. **lead_auto_rejected** - System auto-released the lead after 3 days

---

## User Experience Improvements

1. **Clear Visual Feedback:**
   - Countdown timer shows days remaining
   - Warning badges on history page
   - Color-coded alerts (yellow for 2 days, red for 1 day)

2. **Dual Control:**
   - Both generator and agent can release a lead
   - Prevents stuck leads from bad actors

3. **Automatic Cleanup:**
   - No manual intervention needed for abandoned leads
   - Keeps lead pool fresh and available

4. **Real-time Updates:**
   - Notifications keep both parties informed
   - Lead status updates immediately in UI

---

## Support Contact

For subscription and payment queries:
**WhatsApp: +91 8766759346**
