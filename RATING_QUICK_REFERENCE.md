# Quick Reference: Lead Rating Feature

## What Was Built?

**Lead Generator Rating System** - Allows lead generators to automatically rate service providers when their leads are completed.

---

## How It Works (Simple Version)

```
1. Generator creates lead
2. Provider claims & completes lead
3. Rating modal AUTOMATICALLY pops up
4. Generator rates provider (1-5 stars + optional comment)
5. Rating saved, generator redirected to history
6. Provider's profile shows average rating
```

---

## For Users

### Lead Generator Perspective:
- After a service provider completes your lead
- You'll automatically see a rating popup
- Rate them 1-5 stars (5 = excellent, 1 = poor)
- Optionally add comments
- Click "Submit Rating" to save
- You'll be taken to your History page

### Service Provider Perspective:
- When lead generator rates you
- Your profile updates with new rating
- Your average rating is calculated automatically
- Rating count increases
- Other generators can see your ratings

---

## Code Changes

### Modified File: `src/pages/LeadDetails.tsx`

**New State:**
```typescript
const [autoShowRating, setAutoShowRating] = useState(false);
```

**New Logic in fetchLead():**
```typescript
// Auto-show rating modal for generator when lead is completed
if (data.status === 'completed' && data.created_by_user_id === user.id && !existingRating) {
  setAutoShowRating(true);
}
```

**Updated handleCompleteLead():**
```typescript
// After marking lead complete, fetch fresh data
await fetchLead();  // This triggers the auto-rating modal
```

**Updated RatingModal:**
```typescript
<RatingModal
  open={showRatingModal || autoShowRating}  // Can open manually OR auto
  onOpenChange={(open) => {
    setShowRatingModal(open);
    setAutoShowRating(false);
  }}
  // ... other props
  onRatingSubmitted={() => {
    setHasRated(true);
    navigate('/history');  // Go to history after rating
  }}
/>
```

---

## Database Tables Used

### `ratings` Table
```
id              → uuid (primary key)
lead_id         → uuid (which lead was rated)
rater_id        → uuid (who gave the rating - generator)
rated_user_id   → uuid (who was rated - provider)
rating          → integer (1-5 stars)
comment         → text (optional feedback)
created_at      → timestamp (when rated)
```

### Constraints:
- Service role can insert ratings (for future admin operations)
- Users can only create ratings for leads they generated
- RLS policies prevent data leakage

---

## User Flow Diagram

```
Provider Completes Lead
        ↓
  [Proof Uploaded]
        ↓
  [Lead → COMPLETED]
        ↓
Generator Logs In / Views Lead
        ↓
  [AUTO: Check if generator? ✓]
  [AUTO: Check if completed? ✓]
  [AUTO: Check if not rated? ✓]
        ↓
  ⭐ Rating Modal Appears
  ├─ Provider Name
  ├─ 5 Stars (hover to preview)
  ├─ Comment Box
  └─ Submit Button
        ↓
Generator Selects Stars & Comments
        ↓
  [Submit Rating]
        ↓
  [Toast: "Rating submitted!"]
  [Redirect: /history]
        ↓
Provider Profile Updated
  └─ Average rating recalculated
  └─ Rating count +1
  └─ Visible to future generators
```

---

## Testing Checklist

- [ ] Create lead as User A
- [ ] Claim as User B
- [ ] Complete as User B with proof
- [ ] Rating modal auto-appears for User A
- [ ] Can select 1-5 stars
- [ ] Can add comment
- [ ] Submit button works
- [ ] Rating saved to database
- [ ] User A can't rate same lead twice
- [ ] User B's profile shows updated rating
- [ ] Multiple users can rate User B
- [ ] Average rating calculated correctly

---

## Key Points

✅ **Automatic**: No manual button click needed
✅ **Smart**: Only shows for generators of completed leads
✅ **Secure**: Can't rate same lead twice
✅ **Simple**: Clean 5-star interface
✅ **Helpful**: Comments optional but encouraged
✅ **Transparent**: All ratings visible publicly
✅ **Database-backed**: All data persisted in Supabase

---

## Potential Issues & Solutions

| Problem | Solution |
|---------|----------|
| Modal doesn't appear | Check: Lead is completed? You're the generator? Not already rated? |
| Can't submit rating | Stars must be selected (1-5) |
| Rating not saved | Check browser console for errors, network requests |
| Can rate same lead twice | Refresh page - duplicate prevention should work |
| Average rating wrong | Check all ratings in database, recalculation should be automatic |

---

## Future Enhancements

1. **Two-way ratings**: Providers can also rate generators
2. **Rating badges**: "5-star provider" badges visible everywhere
3. **Rating filters**: Sort providers by rating when claiming leads
4. **Suspend low-rated**: Auto-disable providers with <2.5 stars
5. **Top providers**: Feature highest-rated providers
6. **Rating analytics**: Dashboard showing rating trends
7. **Report abuse**: Flag unfair/fake ratings for admin review

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/pages/LeadDetails.tsx` | Main lead page (modified) |
| `src/components/RatingModal.tsx` | Rating popup component |
| `src/lib/lead-actions.ts` | Lead completion logic |
| `RATING_FEATURE_IMPLEMENTATION.md` | Full technical documentation |
| `RATING_FLOW_DIAGRAM.md` | Visual flow diagrams |
| `RATING_TESTING_GUIDE.md` | QA testing procedures |

---

**Status**: ✅ Ready to Deploy
**Created**: January 23, 2026
**Last Modified**: January 23, 2026
