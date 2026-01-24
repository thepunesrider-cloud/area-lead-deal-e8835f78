# Quick Start Guides - LeadsNearby Features

## 1. Push Notifications Quick Start

### Enable Push Notifications for User
```typescript
import { subscribeToPushNotifications } from '@/lib/push-notifications';

// In Profile or Settings page
const handleEnablePushNotifications = async () => {
  const subscription = await subscribeToPushNotifications(user.id);
  if (subscription) {
    toast({ title: 'Push notifications enabled!' });
  }
};
```

### Test Push Notification
```typescript
import { showDesktopNotification } from '@/lib/push-notifications';

showDesktopNotification('New Lead Available!', {
  body: 'A Rent Agreement lead is available in your area',
  tag: 'lead-notification',
  data: { leadId: '123' }
});
```

---

## 2. Admin Dashboard Quick Start

### Access Admin Dashboard
```
URL: http://localhost:5173/admin/dashboard
```

### What You Can See
- Total leads count
- Completion rate percentage
- Revenue metrics
- Top performing providers
- Lead status pie chart
- Service type breakdown

### Export Report
```typescript
import { exportReport } from '@/lib/export-reports';

const handleExport = (format) => {
  const report = generateLeadReport(leads);
  exportReport(report, format); // 'csv' or 'json'
};
```

---

## 3. Advanced Filtering Quick Start

### Implement Filters in Your Component
```typescript
import { filterLeads, getRecommendedFilters } from '@/lib/advanced-filtering';

const [filters, setFilters] = useState<LeadFilterOptions>({
  status: ['open'],
  serviceType: ['rent_agreement'],
  maxDistance: 10,
  sortBy: 'distance'
});

const filtered = filterLeads(allLeads, filters);

// Get recommended filters for current user
const recommended = getRecommendedFilters(
  userRadius, 
  userServiceType, 
  userRating
);
```

### Full-Text Search
```typescript
const searchFilters: LeadFilterOptions = {
  searchText: 'Pune Sector 5',
  sortBy: 'newest',
  limit: 20
};

const searchResults = filterLeads(leads, searchFilters);
```

---

## 4. Lead Export Quick Start

### Export Leads to CSV
```typescript
import { exportLeadsToCSV, downloadFile } from '@/lib/export-reports';

const handleExportCSV = () => {
  const csv = exportLeadsToCSV(leads, [
    'id',
    'service_type',
    'location_address',
    'status',
    'created_at'
  ]);
  downloadFile(csv, 'leads.csv', 'text/csv');
};
```

### Generate Comprehensive Report
```typescript
import { generateLeadReport, exportReport } from '@/lib/export-reports';

const handleGenerateReport = async () => {
  const report = generateLeadReport(leads);
  console.log(`Total: ${report.totalLeads}`);
  console.log(`Completion Rate: ${report.completionRate}%`);
  console.log(`Top Provider: ${report.topProviders[0].name}`);
  
  exportReport(report, 'json');
};
```

---

## 5. SMS Notifications Quick Start

### Send SMS When Lead is Completed
```typescript
import { notifyGeneratorLeadCompleted } from '@/lib/sms-notifications';

const handleLeadCompleted = async () => {
  const result = await notifyGeneratorLeadCompleted(
    generatorPhone,
    generatorName,
    'Rent Agreement'
  );
  
  if (result.success) {
    console.log('SMS sent successfully');
  }
};
```

### Send Bulk SMS
```typescript
import { sendBulkSMS } from '@/lib/sms-notifications';

const handleBulkNotification = async () => {
  const recipients = [
    { phone: '9876543210', name: 'John' },
    { phone: '9876543211', name: 'Jane' }
  ];
  
  const results = await sendBulkSMS(
    recipients,
    'lead_available',
    (recipient) => ({
      name: recipient.name,
      serviceType: 'Rent Agreement',
      location: 'Pune'
    })
  );
  
  console.log(`Success: ${results.filter(r => r.success).length}`);
};
```

---

## 6. Notification Preferences Quick Start

### Add to User Settings
```typescript
import NotificationPreferences from '@/components/NotificationPreferences';

export const UserSettings = () => {
  return (
    <div>
      <h2>Notification Settings</h2>
      <NotificationPreferences />
    </div>
  );
};
```

### Access User Preferences
```typescript
const { data: preferences } = await supabase
  .from('user_preferences')
  .select('notification_preferences')
  .eq('user_id', userId)
  .single();

const settings = preferences.notification_preferences;
console.log('Push notifications enabled:', settings.pushNotifications);
```

---

## 7. Bulk Operations Quick Start

### Update Multiple Leads Status
```typescript
import { bulkUpdateLeadStatus, getBulkOperationStatus } from '@/lib/bulk-operations';

const handleBulkStatusUpdate = async () => {
  const leadIds = ['lead-1', 'lead-2', 'lead-3'];
  const result = await bulkUpdateLeadStatus(leadIds, 'completed');
  
  console.log(getBulkOperationStatus(result));
  // Output: "3/3 completed (100%)"
};
```

### Bulk Assign Leads
```typescript
import { bulkAssignLeads } from '@/lib/bulk-operations';

const handleBulkAssign = async () => {
  const leadIds = ['lead-1', 'lead-2', 'lead-3'];
  const providerId = 'provider-uuid';
  
  const result = await bulkAssignLeads(leadIds, providerId);
  console.log(`Assigned ${result.success} leads`);
};
```

### Bulk Send Notifications
```typescript
import { bulkSendNotifications } from '@/lib/bulk-operations';

const handleBulkNotify = async () => {
  const userIds = ['user-1', 'user-2', 'user-3'];
  
  const result = await bulkSendNotifications(
    userIds,
    'New Leads Available!',
    'Check the app for new leads in your area'
  );
  
  console.log(`Sent to ${result.success} users`);
};
```

---

## 8. Performance Optimization Quick Start

### Optimize Image Upload
```typescript
import { optimizeImage } from '@/lib/performance-optimization';

const handleImageUpload = async (file: File) => {
  const optimized = await optimizeImage(file, 800, 600, 0.8);
  
  // Upload optimized image instead of original
  await uploadToSupabase(optimized);
};
```

### Cache Data with TTL
```typescript
import { cacheManager } from '@/lib/performance-optimization';

// Set cache
cacheManager.set('leads', leadsData, 30); // 30 minutes

// Get cache
const cached = cacheManager.get('leads');

// Clear specific cache
cacheManager.remove('leads');

// Clear all cache
cacheManager.clear();
```

### Debounce Search
```typescript
import { debounce } from '@/lib/performance-optimization';

const debouncedSearch = debounce((query: string) => {
  // Perform search
  performSearch(query);
}, 300);

const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
  debouncedSearch(e.target.value);
};
```

### Virtual Scrolling for Large Lists
```typescript
import { VirtualScroller } from '@/lib/performance-optimization';

const scroller = new VirtualScroller(50, 10, leads); // itemHeight, visibleCount, items

const handleScroll = (scrollTop: number) => {
  const { items, startIndex } = scroller.getVisibleItems(scrollTop);
  renderVisibleItems(items);
};
```

---

## 9. UI Animations Quick Start

### Add Fade-In Animation
```typescript
import { FadeIn } from '@/components/Animations';

export const MyComponent = () => {
  return (
    <FadeIn delay={0.2}>
      <Card>Animated Card</Card>
    </FadeIn>
  );
};
```

### Add Slide-In Animation
```typescript
import { SlideIn } from '@/components/Animations';

export const MyComponent = () => {
  return (
    <SlideIn direction="up" delay={0.1}>
      <Button>Animated Button</Button>
    </SlideIn>
  );
};
```

### Add Skeleton Loader
```typescript
import { SkeletonLoader } from '@/components/Animations';

export const LoadingState = () => {
  return <SkeletonLoader width="100%" height="20px" count={5} />;
};
```

### Page Transitions
```typescript
import { PageTransition } from '@/components/Animations';

export const MyPage = () => {
  return (
    <PageTransition>
      <div>Page content</div>
    </PageTransition>
  );
};
```

---

## 10. Rating System Quick Start

### View Rating Modal Status
The rating modal auto-appears when:
- Lead status = 'completed'
- User is the lead generator
- Lead has not been rated yet

### Manually Open Rating Modal
```typescript
const [showRatingModal, setShowRatingModal] = useState(false);

<RatingModal
  open={showRatingModal}
  onOpenChange={setShowRatingModal}
  leadId={lead.id}
  ratedUserId={lead.claimed_by_user_id}
  ratedUserName={providerName}
  onRatingSubmitted={() => {
    // Handle after rating
    navigate('/history');
  }}
/>
```

### Check User's Average Rating
```typescript
const { data: ratings } = await supabase
  .from('ratings')
  .select('rating')
  .eq('rated_user_id', userId);

const average = ratings.reduce((a, b) => a + b.rating, 0) / ratings.length;
console.log(`Average Rating: ${average.toFixed(1)} stars`);
```

---

## Testing Checklists

### Push Notifications
- [ ] Request browser permission
- [ ] Receive test notification
- [ ] Click notification to open app
- [ ] Unsubscribe successfully

### Filters & Search
- [ ] Filter by status works
- [ ] Filter by service type works
- [ ] Search finds leads correctly
- [ ] Sorting works in all directions
- [ ] Distance calculation accurate

### Export
- [ ] Export to CSV creates file
- [ ] Export to JSON creates file
- [ ] CSV opens correctly in Excel
- [ ] JSON parses without errors

### Bulk Operations
- [ ] Bulk update affects all leads
- [ ] Bulk notifications send to all users
- [ ] Error handling works
- [ ] Progress tracking accurate

### Performance
- [ ] Images optimize before upload
- [ ] Cache reduces API calls
- [ ] Virtual scrolling smooth at 60fps
- [ ] No memory leaks on page changes

---

## Common Issues & Solutions

### Push Notifications Not Working
- [ ] Check VAPID key in `.env`
- [ ] Verify HTTPS on production
- [ ] Check browser permissions
- [ ] Test in ServiceWorkerScope

### Bulk Operations Failing
- [ ] Check user permissions
- [ ] Verify ID format
- [ ] Check database RLS policies
- [ ] Review error logs

### Performance Issues
- [ ] Clear browser cache
- [ ] Reduce image size
- [ ] Enable virtual scrolling
- [ ] Check network tab

---

**Last Updated**: January 23, 2026
