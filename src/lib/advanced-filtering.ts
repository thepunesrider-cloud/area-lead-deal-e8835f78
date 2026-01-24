/**
 * Advanced Lead Filtering & Search
 */

export interface LeadFilterOptions {
  status?: string[];
  serviceType?: string[];
  minRating?: number;
  maxDistance?: number;
  dateRange?: {
    from: Date;
    to: Date;
  };
  searchText?: string;
  sortBy?: 'newest' | 'oldest' | 'rating' | 'distance';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface LeadWithDistance {
  id: string;
  service_type: string;
  location_lat: number;
  location_long: number;
  location_address: string;
  status: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  claimed_by_user_id: string | null;
  created_by_user_id: string;
  rating?: number;
  distance?: number;
  search_score?: number;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate search score for full-text search
 */
export function calculateSearchScore(lead: LeadWithDistance, searchText: string): number {
  if (!searchText) return 0;

  const text = searchText.toLowerCase();
  let score = 0;

  // Address match
  if (lead.location_address?.toLowerCase().includes(text)) {
    score += 100;
    if (lead.location_address.toLowerCase().startsWith(text)) {
      score += 50;
    }
  }

  // Customer name match
  if (lead.customer_name?.toLowerCase().includes(text)) {
    score += 80;
    if (lead.customer_name.toLowerCase().startsWith(text)) {
      score += 40;
    }
  }

  // Service type match
  if (lead.service_type.toLowerCase().includes(text)) {
    score += 60;
  }

  return score;
}

/**
 * Apply filters to leads
 */
export function filterLeads(leads: LeadWithDistance[], filters: LeadFilterOptions): LeadWithDistance[] {
  let filtered = [...leads];

  // Filter by status
  if (filters.status && filters.status.length > 0) {
    filtered = filtered.filter((lead) => filters.status!.includes(lead.status));
  }

  // Filter by service type
  if (filters.serviceType && filters.serviceType.length > 0) {
    filtered = filtered.filter((lead) => filters.serviceType!.includes(lead.service_type));
  }

  // Filter by rating
  if (filters.minRating !== undefined) {
    filtered = filtered.filter((lead) => (lead.rating || 0) >= filters.minRating!);
  }

  // Filter by distance
  if (filters.maxDistance !== undefined) {
    filtered = filtered.filter((lead) => (lead.distance || 0) <= filters.maxDistance!);
  }

  // Filter by date range
  if (filters.dateRange) {
    filtered = filtered.filter((lead) => {
      const leadDate = new Date(lead.created_at);
      return leadDate >= filters.dateRange!.from && leadDate <= filters.dateRange!.to;
    });
  }

  // Search text
  if (filters.searchText) {
    filtered = filtered.map((lead) => ({
      ...lead,
      search_score: calculateSearchScore(lead, filters.searchText!),
    }));
    filtered = filtered.filter((lead) => (lead.search_score || 0) > 0);
  }

  // Sort
  const sortBy = filters.sortBy || 'newest';
  const sortOrder = filters.sortOrder || 'desc';

  filtered.sort((a, b) => {
    let compareValue = 0;

    switch (sortBy) {
      case 'newest':
        compareValue = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        break;
      case 'oldest':
        compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'rating':
        compareValue = (b.rating || 0) - (a.rating || 0);
        break;
      case 'distance':
        compareValue = (a.distance || 0) - (b.distance || 0);
        break;
      default:
        compareValue = 0;
    }

    if (sortOrder === 'asc') {
      compareValue *= -1;
    }

    return compareValue;
  });

  // Pagination
  if (filters.offset !== undefined && filters.limit !== undefined) {
    filtered = filtered.slice(filters.offset, filters.offset + filters.limit);
  }

  return filtered;
}

/**
 * Get filter summary
 */
export function getFilterSummary(filters: LeadFilterOptions): string[] {
  const summary: string[] = [];

  if (filters.status?.length) {
    summary.push(`Status: ${filters.status.join(', ')}`);
  }

  if (filters.serviceType?.length) {
    summary.push(`Service: ${filters.serviceType.join(', ')}`);
  }

  if (filters.minRating) {
    summary.push(`Min Rating: ★${filters.minRating}`);
  }

  if (filters.maxDistance) {
    summary.push(`Within ${filters.maxDistance}km`);
  }

  if (filters.searchText) {
    summary.push(`Search: "${filters.searchText}"`);
  }

  return summary;
}

/**
 * Get recommended filters based on user profile
 */
export function getRecommendedFilters(
  userServiceRadius: number,
  userServiceType: string,
  userRating?: number
): LeadFilterOptions {
  return {
    status: ['open', 'claimed'],
    serviceType: [userServiceType],
    maxDistance: userServiceRadius,
    minRating: userRating ? Math.max(0, userRating - 1) : undefined,
    sortBy: 'distance',
    sortOrder: 'asc',
  };
}
