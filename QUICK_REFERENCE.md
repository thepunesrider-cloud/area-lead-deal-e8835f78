# Quick Reference: New Features

## 1. Get Back / Reject Lead

### Lead Generator View (My Posted Leads):
When viewing a lead that someone has claimed:
- Click **"Get Back Lead"** button (red button at bottom)
- Confirms you want to retrieve the lead
- Lead becomes available again for others to claim
- Agent receives notification

### Agent View (My Accepted Leads):
When viewing a claimed lead:
- Click **"Reject / Cancel"** button (red button at bottom)  
- Releases the lead back to available
- Generator receives notification

## 2. 3-Day Auto-Expiration

### Countdown Display:
- **LeadDetails page**: Large warning banner shows days remaining
- **History page**: Small badge shows expiry countdown
- **Colors**: 
  - Orange: 2-3 days remaining
  - Red: 0-1 days remaining

### What Happens:
- Day 0: Lead claimed by agent
- Day 1-2: Normal work period
- Day 3: Auto-released if not completed
- Both parties get notifications

### Client-Side Check:
- Runs when app opens
- Runs every hour while app is open
- Server-side cron should also run daily

## 3. Updated Contact Number

**Old:** 9999999999  
**New:** 8766759346

Used in:
- Subscribe button WhatsApp link
- Payment inquiries

---

## Developer Notes

### Key Files:
```
Frontend:
- src/pages/LeadDetails.tsx (main lead UI)
- src/pages/History.tsx (lead list with warnings)
- src/pages/GetLeads.tsx (phone number)
- src/lib/auto-rejection.ts (expiry logic)
- src/lib/lead-actions.ts (reject/release)

Backend:
- supabase/migrations/20260115000000_add_auto_rejection_feature.sql
- supabase/functions/auto-reject-leads/index.ts
```

### Testing Tips:
1. **Manual Time Travel**: Update `claimed_at` in database
   ```sql
   UPDATE leads 
   SET claimed_at = NOW() - INTERVAL '3 days 1 hour'
   WHERE id = 'your-lead-id';
   ```

2. **Trigger Client Check**: Reload app or wait 1 hour

3. **Trigger Edge Function**: 
   ```bash
   curl -X POST 'YOUR_SUPABASE_URL/functions/v1/auto-reject-leads' \
     -H 'Authorization: Bearer YOUR_ANON_KEY'
   ```

### Notification Types:
- `lead_rejected` - Agent released lead
- `lead_recalled` - Generator took back lead  
- `lead_auto_rejected` - System auto-released lead
