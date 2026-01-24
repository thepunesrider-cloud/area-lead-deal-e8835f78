# Lead Completion & Rating Flow

## Complete User Journey

```
LEAD GENERATOR (User A)                 SERVICE PROVIDER (User B)
─────────────────────                   ──────────────────────

1. Creates Lead
   └─→ Lead Status: OPEN
       └─→ Visible to all providers

                                        2. Views Available Leads
                                           └─→ Sees Lead Details
                                              └─→ Click "Claim Lead"

                                        3. Lead Claimed by User B
   ← Lead Status: CLAIMED
     ← Notified via WhatsApp/In-App
     └─→ Can view provider profile
        └─→ See provider's ratings
        └─→ Chat with provider

                                        4. Provider Works on Lead
                                           └─→ Completes the work
                                              └─→ Takes proof photo/screenshot

                                        5. Provider Marks Complete
                                           └─→ Uploads proof image
   ← Lead Status: COMPLETED              └─→ Clicks "Complete Lead"
     ← Notified immediately

6. RATING MODAL AUTO-APPEARS ⭐⭐⭐⭐⭐
   ├─→ Shows provider's name
   ├─→ Star rating interface (1-5)
   ├─→ Optional comment field
   └─→ "Submit Rating" button
       └─→ Rating saved to database
           └─→ Redirected to History

                                        Provider's Profile Updated:
                                        ├─→ Average rating updated
                                        ├─→ Rating count +1
                                        └─→ Visible when viewed

7. Lead Status: COMPLETED & RATED ✓
   └─→ Appears in History
       └─→ Shows rating submitted
       └─→ Shows proof image
```

## System Architecture

```
LeadDetails Page
├─ fetchLead()
│  ├─ Get lead details from DB
│  ├─ Check if status === 'completed'
│  ├─ Check if user === created_by_user_id (generator)
│  ├─ Check if already rated
│  └─→ IF all true: setAutoShowRating(true)
│
├─ handleCompleteLead()
│  ├─ Upload proof image to storage
│  ├─ Update lead status to 'completed'
│  ├─ Notify generator
│  ├─ Close complete modal
│  └─→ Call fetchLead() to refresh data
│      └─→ Triggers auto-rating modal
│
└─ RatingModal Component
   ├─ open={showRatingModal || autoShowRating}
   ├─ 5-star rating interface
   ├─ Optional comment field
   ├─ OnSubmit:
   │  ├─ Save rating to DB
   │  ├─ Show toast notification
   │  ├─ setHasRated(true)
   │  └─→ navigate('/history')
   └─ OnCancel:
      └─→ Just closes modal
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ Lead Completion Workflow                                │
└─────────────────────────────────────────────────────────┘

   Service Provider                Database               Generator
         │                           │                        │
         │─── Upload Proof ────────→ │                        │
         │                           │                        │
         │─ Mark Complete ──────────→ │ Update Status:         │
         │                           │ COMPLETED              │
         │                           │                        │
         │                           │◄─ Query Lead ────────┬─│
         │                           │   (status=completed) │ │
         │                           │   (creator=generator)│ │
         │                           │                    │  │
         │                           │ Auto-Rating Check  │  │
         │                           │ • Status=completed? ✓  │
         │                           │ • Is generator? ✓      │
         │                           │ • Not rated yet? ✓    │
         │                           │                    │  │
         │                           │──→ setAutoShowRating(true)
         │                           │                    │  │
         │                           │ ┌────────────────┐ │  │
         │                           │ │ RatingModal    │ │  │
         │                           │ │ Auto-Opens     │ │  │
         │                           │ │  ⭐⭐⭐⭐⭐      │◄─┘
         │                           │ │ Provider Name  │
         │                           │ │ Comments       │
         │                           │ └────────────────┘
         │                           │       │
         │                           │       │ Generator Rates
         │                           │       │
         │         Rating Saved ◄───┤◄──────┤
         │                           │       │
         │                           │       ├─ Navigate /history
         │                           │       │
```

## Rating Display

```
SERVICE PROVIDER PROFILE VIEW
╔════════════════════════════════════════╗
║  Provider Name: John Smith             ║
║  Service Type: Rent Agreement          ║
║  Location: Pune, Maharashtra           ║
║  Service Radius: 15 km                 ║
║                                        ║
║  ⭐ 4.5 (23 ratings)                   ║
║  ╔════════════════════════════════╗   ║
║  ║ Recent ratings from generators:║   ║
║  ║ ★★★★★ - "Excellent work!"     ║   ║
║  ║ ★★★★☆ - "Good job"            ║   ║
║  ║ ★★★★★ - "Fast & reliable"     ║   ║
║  ╚════════════════════════════════╝   ║
║                                        ║
║  [Chat with Provider]                  ║
║  [View All Ratings]                    ║
╚════════════════════════════════════════╝
```

## State Management

```
LeadDetails Component State:
├─ lead: Lead data from DB
├─ showCompleteModal: bool (upload proof dialog)
├─ showRatingModal: bool (manual rating open)
├─ autoShowRating: bool (auto-open when completed) ← NEW
├─ hasRated: bool (already rated this lead)
├─ proofFile: File (proof image)
└─ generatorPhone, claimerName, claimerRating: cached user info
```

## Error Handling

```
Rating Submission Errors:
├─ No rating selected
│  └─→ Show toast: "Please select a star rating"
│
├─ Not authenticated
│  └─→ Show toast: "Please login"
│
├─ Database error
│  └─→ Show toast: "Failed to submit rating. Please try again."
│
└─ Network error
   └─→ Retry logic built into Supabase client
```

---

**Implementation Date**: January 23, 2026
**Component**: LeadDetails.tsx
**Feature Status**: ✅ Ready for Testing
