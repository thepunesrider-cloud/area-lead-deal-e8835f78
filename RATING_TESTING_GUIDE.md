# Testing Guide: Lead Generator Rating System

## Quick Test Script

### Prerequisites
- Two test user accounts (or more)
- User A: Lead Generator
- User B: Service Provider

## Test Case 1: Basic Rating Flow

### Step-by-Step

**1. User A - Create a Lead**
```
1. Login as User A (Lead Generator)
2. Go to "Generate Lead" page
3. Fill in lead details:
   - Service Type: "Rent Agreement"
   - Location: Any location in Pune
4. Click "Create Lead"
5. Verify: Lead appears in Dashboard
6. Note down the Lead ID
```

**2. User B - Claim the Lead**
```
1. Login as User B (Service Provider)
2. Go to "Get Leads" page
3. Find the lead created by User A
4. Click on lead card → See "Claim Lead" button
5. Click "Claim Lead"
6. Verify: Lead status changes to CLAIMED
7. Verify: User A gets WhatsApp notification about claim
```

**3. User B - Complete the Lead**
```
1. Stay as User B on Lead Details page
2. Scroll down → Find "Complete Lead" button
3. Click "Complete Lead"
4. In modal:
   - Take a screenshot or photo as "proof"
   - Click upload area
   - Select image file
5. Click "Complete" button
6. Verify: 
   - Toast: "Lead completed successfully!"
   - Lead status changes to COMPLETED
```

**4. User A - Rate the Provider (AUTO-MODAL)**
```
⭐ EXPECTED BEHAVIOR: Rating Modal Appears Automatically
   [Wait 1-2 seconds after User B completes]

1. Go back to Lead Details as User A
2. Modal appears automatically with:
   - Title: "Rate [Provider Name]"
   - 5 star rating interface
   - Comment field (optional)
   - "Submit Rating" button

3. Test star interaction:
   - Hover over stars → they highlight
   - Click star 1 → Shows "Poor"
   - Click star 2 → Shows "Fair"
   - Click star 3 → Shows "Good"
   - Click star 4 → Shows "Very Good"
   - Click star 5 → Shows "Excellent"

4. Add comment (optional):
   - Type: "Great work, very professional!"
   
5. Click "Submit Rating"
6. Verify:
   - Toast: "Rating submitted" + "Thank you for your feedback!"
   - Modal closes
   - Redirected to History page
```

**5. Verify Rating Saved**
```
1. Go back to Lead Details
2. Verify:
   - "Rate Service Provider" button NO LONGER appears
   - (Button hidden after rating submitted)

3. View Provider Profile:
   - Click "View Provider Profile" button (if available)
   - Should see average rating updated
   - Rating count should show "1 rating"
```

---

## Test Case 2: Prevent Duplicate Ratings

**Purpose**: Verify same user can't rate same lead twice

```
1. Start from Lead Details (already rated)
2. Try to find "Rate Service Provider" button
   → Should NOT be visible (hasRated = true)

3. Refresh page (F5)
   → Rating modal should NOT appear
   → (Already rated check still works)

4. Try to manually access rating somehow
   → Should get error preventing duplicate
```

---

## Test Case 3: Multiple Generators Rating Same Provider

**Purpose**: Verify multiple people can rate the same provider

```
1. User A creates Lead 1 → User B completes it → User A rates (5 stars)
2. User C creates Lead 2 → User B completes it → User C rates (4 stars)
3. User D creates Lead 3 → User B completes it → User D rates (5 stars)

Check User B's profile:
- Should show average: (5+4+5)/3 = 4.67 stars
- Should show count: 3 ratings
```

---

## Test Case 4: Auto-Modal Triggers Only for Generator

**Purpose**: Verify claimer doesn't see rating modal

```
1. User A creates lead
2. User B claims lead
3. User B completes lead

   [Rating modal appears for User A]

4. Now test as User B:
   - Go to same Lead Details page
   - Rating modal should NOT appear
   - (Because User B is not the generator)
```

---

## Test Case 5: Rating Visibility

**Purpose**: Verify ratings display correctly

```
1. Navigate to lead that's been rated
2. For Generator (User A):
   - See "View Provider Profile" button
   - Click it → See average rating with ★ icon
   - Should show: "★ [rating] ([count] ratings)"

3. Profile Modal shows:
   - Provider's average rating
   - Total number of ratings received
   - Recent rating comments (if available)
```

---

## Test Case 6: Edge Cases

### 6A: Cancel Rating Modal
```
1. Lead completed, rating modal appears
2. Click "Cancel" button
3. Modal closes
4. Rating NOT saved (don't check database yet)
5. Lead Details page still shows lead as completed
6. Click lead again
   → Rating modal should appear again (not yet rated)
```

### 6B: Close Modal Without Rating
```
1. Rating modal open
2. Click X button (close modal)
3. Modal closes
4. Rating NOT saved
5. Refresh page
   → Rating modal appears again
```

### 6C: Submit Without Stars
```
1. Rating modal open
2. Leave stars at 0 (no selection)
3. Click "Submit Rating"
4. Verify error toast: "Please select a star rating"
5. Modal stays open
```

### 6D: Comment With Special Characters
```
1. Rating modal open
2. Select 5 stars
3. In comment field type: "Good! 🎉 @user #hashtag"
4. Click "Submit Rating"
5. Should work fine (special chars supported)
```

---

## Automated Testing (for QA)

### Test Database Queries

**Check if rating was saved:**
```sql
SELECT * FROM ratings 
WHERE lead_id = '[LEAD_ID]' 
AND rater_id = '[GENERATOR_ID]'
AND rated_user_id = '[PROVIDER_ID]';

-- Expected: 1 row with rating value 1-5
```

**Check user ratings:**
```sql
SELECT 
  AVG(rating) as average_rating,
  COUNT(*) as total_ratings
FROM ratings 
WHERE rated_user_id = '[PROVIDER_ID]';

-- Expected: Shows average and count
```

**Check for duplicates:**
```sql
SELECT 
  lead_id,
  COUNT(*) as duplicate_count
FROM ratings 
GROUP BY lead_id
HAVING COUNT(*) > 1;

-- Expected: No results (no duplicates)
```

---

## Browser DevTools Debugging

### Check Console Logs

```javascript
// Expected logs when rating submitted:
// "Rating submitted successfully"
// "Modal closed"
// "Redirecting to /history"

// Check for errors:
// No 403 Forbidden (would indicate RLS policy issue)
// No 400 Bad Request (would indicate data validation issue)
```

### Check Network Tab

```
POST /rest/v1/ratings?... [200 OK]
{
  "id": "uuid",
  "lead_id": "...",
  "rater_id": "...",
  "rated_user_id": "...",
  "rating": 5,
  "comment": "...",
  "created_at": "2026-01-23T..."
}
```

---

## Performance Testing

```
1. Load Lead Details page with 100+ previous ratings
   → Page should load within 3 seconds
   
2. Submit rating while network is slow
   → Should show loading spinner on button
   → Should complete successfully

3. Open rating modal multiple times
   → Should not leak memory
   → Component should unmount cleanly
```

---

## Accessibility Testing

```
1. Tab through rating modal
   - Should navigate through stars
   - Should reach comment field
   - Should reach buttons
   
2. Keyboard interaction:
   - Arrow keys change star selection
   - Enter submits form
   - Escape closes modal
   
3. Screen reader:
   - Should read "Rate [Name]" as heading
   - Should read each star as "1 star", "2 stars", etc.
   - Should announce rating value changes
```

---

## Success Criteria

✅ **Test Passed If:**
- [ ] Rating modal appears automatically after lead completion
- [ ] User cannot submit without selecting stars
- [ ] Rating saved to database with all data
- [ ] User cannot rate same lead twice
- [ ] Provider's average rating updates correctly
- [ ] Multiple users can rate same provider
- [ ] Only generator can rate (not claimer)
- [ ] Rating persists after page refresh
- [ ] User redirected to history after rating
- [ ] No console errors in browser DevTools

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Modal doesn't appear | Lead not completed or user not generator | Verify lead status & userId match |
| Rating not saving | RLS policy issue | Check Supabase policies on ratings table |
| Duplicate ratings allowed | hasRated state not set | Check useEffect in fetchLead() |
| Wrong average shown | Calculation error or stale data | Refresh page, check SQL sum/count |
| Modal appears but can't submit | Button disabled | Select stars first (rating > 0) |
| Getting 403 error | RLS policy blocking insert | Verify user is authenticated |

---

## Test Data Reset

To clear test data and start fresh:

```sql
-- Delete test ratings
DELETE FROM ratings 
WHERE lead_id IN (
  SELECT id FROM leads 
  WHERE created_by_user_id = '[TEST_USER_ID]'
);

-- Delete test leads
DELETE FROM leads 
WHERE created_by_user_id = '[TEST_USER_ID]';

-- Verify cleanup
SELECT COUNT(*) FROM ratings;
SELECT COUNT(*) FROM leads;
```

---

**Test Plan Status**: ✅ Ready for QA
**Last Updated**: January 23, 2026
