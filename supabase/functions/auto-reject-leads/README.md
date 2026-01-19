# Auto-Reject Leads Edge Function

This edge function automatically rejects leads that have been claimed for more than 3 days without completion.

## Deployment

1. Deploy the edge function:
```bash
supabase functions deploy auto-reject-leads
```

2. Set up a cron job to run this function daily. You can use:
   - External cron service (like cron-job.org)
   - GitHub Actions with scheduled workflows
   - Your own server cron job

## Cron Setup Example

### Using cron-job.org:
1. Create a new cron job at https://cron-job.org
2. URL: `https://your-project-ref.supabase.co/functions/v1/auto-reject-leads`
3. Schedule: Daily at midnight (0 0 * * *)
4. Add header: `Authorization: Bearer YOUR_ANON_KEY`

### Using GitHub Actions:
Create `.github/workflows/auto-reject-leads.yml`:
```yaml
name: Auto-Reject Expired Leads
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  auto-reject:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST \
            'https://your-project-ref.supabase.co/functions/v1/auto-reject-leads' \
            -H 'Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}'
```

## Manual Testing

```bash
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/auto-reject-leads' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

## Response Format

Success:
```json
{
  "message": "Auto-rejection completed",
  "count": 3,
  "rejectedLeadIds": ["uuid1", "uuid2", "uuid3"]
}
```

No leads to reject:
```json
{
  "message": "No leads to auto-reject",
  "count": 0
}
```

Error:
```json
{
  "error": "error message"
}
```

## Database Migration

The migration file `20260115000000_add_auto_rejection_feature.sql` should be applied first:
```bash
supabase db push
```

This creates:
- Database function `auto_reject_expired_leads()`
- Index for better query performance

## Client-Side Backup

The application also checks for expired leads on app load and every hour as a backup mechanism. This is implemented in:
- `src/lib/auto-rejection.ts` - Utility functions
- `src/App.tsx` - Integration with app lifecycle
