$SUPABASE_URL = "https://rwhgqhzvheoubqyuqwhq.supabase.co"
$ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3aGdxaHp2aGVvdWJxeXVxd2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNzk4OTcsImV4cCI6MjA4Mjg1NTg5N30.Vil0yzntKNcbD4u3284DrNhf0WhHeei4CNYLFwsN7qs"

# Count total leads
$count = Invoke-RestMethod `
  -Method GET `
  -Uri "$SUPABASE_URL/rest/v1/leads?select=count" `
  -Headers @{ apikey = $ANON; Authorization = "Bearer $ANON" } `
  -ContentType "application/json"

Write-Host "Total leads: $($count.Count)"

# Show all leads with key fields
$allLeads = Invoke-RestMethod `
  -Method GET `
  -Uri "$SUPABASE_URL/rest/v1/leads?select=id,status,location_lat,location_long,location_address,created_at&limit=20" `
  -Headers @{ apikey = $ANON; Authorization = "Bearer $ANON" }

Write-Host "All leads:" ($allLeads | ConvertTo-Json -Depth 5)