/**
 * Lead Export & Reports Generator
 */

import { formatISO } from 'date-fns';

export interface ExportOptions {
  format: 'csv' | 'json' | 'excel';
  includeFields: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface LeadReport {
  totalLeads: number;
  completedLeads: number;
  openLeads: number;
  claimedLeads: number;
  completionRate: number;
  averageClaimTime: number;
  averageCompletionTime: number;
  topProviders: Array<{
    userId: string;
    name: string;
    completedCount: number;
    averageRating: number;
  }>;
  topServiceTypes: Array<{
    serviceType: string;
    count: number;
    completionRate: number;
  }>;
  revenueMetrics?: {
    totalRevenue: number;
    averageLeadValue: number;
    subscriptionRevenue: number;
  };
}

/**
 * Export leads to CSV
 */
export function exportLeadsToCSV(leads: any[], fields: string[] = []): string {
  if (leads.length === 0) {
    return '';
  }

  const actualFields = fields.length > 0 ? fields : Object.keys(leads[0]);
  
  // Create header
  const header = actualFields.join(',');
  
  // Create rows
  const rows = leads.map((lead) =>
    actualFields
      .map((field) => {
        const value = lead[field];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(',')
  );
  
  return [header, ...rows].join('\n');
}

/**
 * Export leads to JSON
 */
export function exportLeadsToJSON(leads: any[]): string {
  return JSON.stringify(leads, null, 2);
}

/**
 * Download file to user's computer
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const element = document.createElement('a');
  element.setAttribute('href', `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`);
  element.setAttribute('download', filename);
  element.style.display = 'none';
  
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

/**
 * Generate lead report
 */
export function generateLeadReport(leads: any[]): LeadReport {
  const completed = leads.filter((l) => l.status === 'completed');
  const open = leads.filter((l) => l.status === 'open');
  const claimed = leads.filter((l) => l.status === 'claimed');
  
  // Calculate metrics
  const totalLeads = leads.length;
  const completionRate = totalLeads > 0 ? (completed.length / totalLeads) * 100 : 0;
  
  // Calculate average times
  let averageClaimTime = 0;
  let averageCompletionTime = 0;
  
  const claimedLeads = leads.filter((l) => l.claimed_at);
  if (claimedLeads.length > 0) {
    const totalClaimTime = claimedLeads.reduce((sum, l) => {
      const createdTime = new Date(l.created_at).getTime();
      const claimedTime = new Date(l.claimed_at).getTime();
      return sum + (claimedTime - createdTime);
    }, 0);
    averageClaimTime = totalClaimTime / claimedLeads.length / (1000 * 60 * 60); // in hours
  }
  
  if (completed.length > 0) {
    const totalCompletionTime = completed.reduce((sum, l) => {
      const createdTime = new Date(l.created_at).getTime();
      const completedTime = new Date(l.completed_at || l.created_at).getTime();
      return sum + (completedTime - createdTime);
    }, 0);
    averageCompletionTime = totalCompletionTime / completed.length / (1000 * 60 * 60); // in hours
  }
  
  // Top providers
  const providerStats = new Map();
  completed.forEach((lead) => {
    if (lead.claimed_by_user_id) {
      const key = lead.claimed_by_user_id;
      if (!providerStats.has(key)) {
        providerStats.set(key, {
          userId: lead.claimed_by_user_id,
          name: lead.claimer_name || 'Unknown',
          completedCount: 0,
          ratings: [],
        });
      }
      const stats = providerStats.get(key);
      stats.completedCount += 1;
    }
  });
  
  const topProviders = Array.from(providerStats.values())
    .sort((a, b) => b.completedCount - a.completedCount)
    .slice(0, 10)
    .map((p) => ({
      userId: p.userId,
      name: p.name,
      completedCount: p.completedCount,
      averageRating: p.ratings.length > 0 ? p.ratings.reduce((a: number, b: number) => a + b) / p.ratings.length : 0,
    }));
  
  // Top service types
  const serviceTypeStats = new Map();
  leads.forEach((lead) => {
    const key = lead.service_type;
    if (!serviceTypeStats.has(key)) {
      serviceTypeStats.set(key, {
        serviceType: lead.service_type,
        count: 0,
        completed: 0,
      });
    }
    const stats = serviceTypeStats.get(key);
    stats.count += 1;
    if (lead.status === 'completed') {
      stats.completed += 1;
    }
  });
  
  const topServiceTypes = Array.from(serviceTypeStats.values())
    .sort((a, b) => b.count - a.count)
    .map((s) => ({
      serviceType: s.serviceType,
      count: s.count,
      completionRate: (s.completed / s.count) * 100,
    }));
  
  return {
    totalLeads,
    completedLeads: completed.length,
    openLeads: open.length,
    claimedLeads: claimed.length,
    completionRate,
    averageClaimTime: Math.round(averageClaimTime * 10) / 10,
    averageCompletionTime: Math.round(averageCompletionTime * 10) / 10,
    topProviders,
    topServiceTypes,
  };
}

/**
 * Export report to file
 */
export function exportReport(report: LeadReport, format: 'csv' | 'json'): void {
  const timestamp = formatISO(new Date(), { representation: 'date' });
  
  if (format === 'json') {
    const json = JSON.stringify(report, null, 2);
    downloadFile(json, `lead-report-${timestamp}.json`, 'application/json');
  } else if (format === 'csv') {
    const csv = reportToCSV(report);
    downloadFile(csv, `lead-report-${timestamp}.csv`, 'text/csv');
  }
}

/**
 * Convert report to CSV format
 */
function reportToCSV(report: LeadReport): string {
  const lines: string[] = [];
  
  lines.push('Lead Report Summary');
  lines.push('');
  lines.push(`Total Leads,${report.totalLeads}`);
  lines.push(`Completed,${report.completedLeads}`);
  lines.push(`Open,${report.openLeads}`);
  lines.push(`Claimed,${report.claimedLeads}`);
  lines.push(`Completion Rate,${report.completionRate.toFixed(2)}%`);
  lines.push(`Avg Claim Time (hrs),${report.averageClaimTime}`);
  lines.push(`Avg Completion Time (hrs),${report.averageCompletionTime}`);
  lines.push('');
  
  lines.push('Top Service Types');
  lines.push('Service Type,Count,Completion Rate');
  report.topServiceTypes.forEach((s) => {
    lines.push(`${s.serviceType},${s.count},${s.completionRate.toFixed(2)}%`);
  });
  lines.push('');
  
  lines.push('Top Providers');
  lines.push('Name,Completed,Avg Rating');
  report.topProviders.forEach((p) => {
    lines.push(`${p.name},${p.completedCount},${p.averageRating.toFixed(2)}`);
  });
  
  return lines.join('\n');
}

/**
 * Generate admin dashboard data
 */
export function generateAdminDashboardData(leads: any[], payments: any[] = []): any {
  const report = generateLeadReport(leads);
  
  const revenueMetrics = {
    totalRevenue: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
    averageLeadValue: leads.length > 0 ? payments.reduce((sum, p) => sum + (p.amount || 0), 0) / leads.length : 0,
    subscriptionRevenue: payments
      .filter((p) => p.type === 'subscription')
      .reduce((sum, p) => sum + (p.amount || 0), 0),
  };
  
  return {
    ...report,
    revenueMetrics,
    lastUpdated: new Date().toISOString(),
  };
}
