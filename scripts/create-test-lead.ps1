# Create a test lead directly using service role key
$SUPABASE_URL = "https://rwhgqhzvheoubqyuqwhq.supabase.co"
$SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3aGdxaHp2aGVvdWJxeXVxd2hxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzI3OTg5NywiZXhwIjoyMDgyODU1ODk3fQ.noudVoR6qM4VOHI33tLq-DsAxeY0-XndngiwOta66sU"

Write-Host "=== Creating Test Lead ===" -ForegroundColor Cyan

Write-Host ""
Write-Host "Step 1: Creating test profile..." -ForegroundColor Yellow

$headers = @{
    "apikey" = $SERVICE_ROLE_KEY
    "Authorization" = "Bearer $SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
}

# Create a test user profile (Katraj area: 18.4485° N, 73.8633° E)
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
    $profile = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/profiles" -Method Post -Headers $headers -Body $profileBody
    Write-Host "✓ Profile created: Test User Katraj (8766759346)" -ForegroundColor Green
} catch {
    Write-Host "⚠ Profile: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 2: Creating test lead in Katraj..." -ForegroundColor Yellow

# Create a test lead near Katraj
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

$lead = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/leads" -Method Post -Headers $headers -Body $leadBody -ResponseHeadersVariable responseHeaders
$leadId = ($lead | Select-Object -First 1).id
Write-Host "✓ Lead created with ID: $leadId" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Triggering WhatsApp notifications..." -ForegroundColor Yellow

$notifyBody = @{
    lead_id = $leadId
    lead_lat = 18.4490
    lead_long = 73.8640
    service_type = "rent_agreement"
    location_address = "Katraj, Pune"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/send-lead-notification" -Method Post -Headers $headers -Body $notifyBody

Write-Host ""
Write-Host "=== NOTIFICATION RESULTS ===" -ForegroundColor Cyan
Write-Host ($response | ConvertTo-Json -Depth 5)

if ($response.details) {
    Write-Host ""
    Write-Host "📱 Messages sent to:" -ForegroundColor Green
    $response.details | ForEach-Object {
        $status = if ($_.sent) { "✓ SENT" } else { "✗ FAILED" }
        Write-Host "  $status - $($_.phone) ($($_.name))" -ForegroundColor $(if ($_.sent) { "Green" } else { "Red" })
    }
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Cyan
