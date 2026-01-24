# Check database directly
$SUPABASE_URL = "https://rwhgqhzvheoubqyuqwhq.supabase.co"
$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3aGdxaHp2aGVvdWJxeXVxd2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNzk4OTcsImV4cCI6MjA4Mjg1NTg5N30.Vil0yzntKNcbD4u3284DrNhf0WhHeei4CNYLFwsN7qs"

Write-Host "=== Checking Database ===" -ForegroundColor Cyan

# Check leads
Write-Host "`n1. Checking leads table..." -ForegroundColor Yellow
$headers = @{
    "apikey" = $ANON_KEY
    "Authorization" = "Bearer $ANON_KEY"
    "Content-Type" = "application/json"
}

try {
    $leadsResponse = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/leads?select=*&limit=5" -Method Get -Headers $headers
    Write-Host "Found $($leadsResponse.Count) leads:" -ForegroundColor Green
    $leadsResponse | ForEach-Object { 
        Write-Host "  - Lead ID: $($_.id) | Status: $($_.status) | Area: $($_.area_locality)" 
    }
} catch {
    Write-Host "ERROR fetching leads: $_" -ForegroundColor Red
}

# Check profiles
Write-Host "`n2. Checking profiles table..." -ForegroundColor Yellow
try {
    $profilesResponse = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/profiles?select=id,name,phone,location_lat,location_long&limit=5" -Method Get -Headers $headers
    Write-Host "Found $($profilesResponse.Count) profiles:" -ForegroundColor Green
    $profilesResponse | ForEach-Object { 
        Write-Host "  - User: $($_.name) | Phone: $($_.phone) | Location: ($($_.location_lat), $($_.location_long))" 
    }
} catch {
    Write-Host "ERROR fetching profiles: $_" -ForegroundColor Red
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
