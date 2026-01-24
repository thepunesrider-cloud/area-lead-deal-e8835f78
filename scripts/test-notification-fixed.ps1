$SUPABASE_URL = "https://rwhgqhzvheoubqyuqwhq.supabase.co"
$SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3aGdxaHp2aGVvdWJxeXVxd2hxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzI3OTg5NywiZXhwIjoyMDgyODU1ODk3fQ.noudVoR6qM4VOHI33tLq-DsAxeY0-XndngiwOta66sU"

Write-Host "=== Creating Test Lead & Sending Notifications ===" -ForegroundColor Cyan

$headers = @{
    "apikey" = $SERVICE_ROLE_KEY
    "Authorization" = "Bearer $SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

# Step 1: Create profile
Write-Host "`n[1/3] Creating test profile..." -ForegroundColor Yellow
$profileBody = @{
    id = "00000000-0000-0000-0000-000000000001"
    name = "Test User Katraj"
    phone = "8766759346"
    location_lat = 18.4485
    location_long = 73.8633
    service_radius_km = 10
    service_type = "rent_agreement"
    is_subscribed = $true
} | ConvertTo-Json

try {
    $null = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/profiles" -Method Post -Headers $headers -Body $profileBody
    Write-Host "âœ“ Profile created" -ForegroundColor Green
} catch {
    Write-Host "âš  Profile: $_" -ForegroundColor Yellow
}

# Step 2: Create lead
Write-Host "`n[2/3] Creating test lead in Katraj..." -ForegroundColor Yellow
$leadBody = @{
    created_by_user_id = "00000000-0000-0000-0000-000000000001"
    service_type = "rent_agreement"
    location_lat = 18.4490
    location_long = 73.8640
    location_address = "Katraj, Pune"
    customer_name = "Test Customer"
    customer_phone = "9999999999"
    notes = "Test lead for WhatsApp notification"
    status = "open"
} | ConvertTo-Json

$lead = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/leads" -Method Post -Headers $headers -Body $leadBody
$leadId = $lead.id
Write-Host "âœ“ Lead created: $leadId" -ForegroundColor Green

# Step 3: Send notifications
Write-Host "`n[3/3] Sending WhatsApp notifications..." -ForegroundColor Yellow
$notifyBody = @{
    lead_id = $leadId
    lead_lat = 18.4490
    lead_long = 73.8640
    service_type = "rent_agreement"
    location_address = "Katraj, Pune"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/send-lead-notification" -Method Post -Headers $headers -Body $notifyBody

Write-Host "`n=== RESULTS ===" -ForegroundColor Cyan
Write-Host "Summary: $($response.summary)" -ForegroundColor White
Write-Host "Eligible users: $($response.eligible_users)" -ForegroundColor White
Write-Host "Sent: $($response.notifications_sent)" -ForegroundColor Green
Write-Host "Failed: $($response.failed_count)" -ForegroundColor Red

if ($response.details) {
    Write-Host "`nðŸ“± Detailed Results:" -ForegroundColor Cyan
    foreach ($detail in $response.details) {
        $statusIcon = if ($detail.sent) { "âœ“" } else { "âœ—" }
        $color = if ($detail.sent) { "Green" } else { "Red" }
        Write-Host "  $statusIcon $($detail.phone) - $($detail.name)" -ForegroundColor $color
    }
}

if ($response.failed_phones -and $response.failed_phones.Count -gt 0) {
    Write-Host "`nâŒ Failed phones:" -ForegroundColor Red
    $response.failed_phones | ForEach-Object { Write-Host "  - $_" }
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan

