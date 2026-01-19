import React, { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LeadFilters {
  serviceType?: string;
  minDistance?: number;
  maxDistance?: number;
  dateFrom?: string;
  dateTo?: string;
}

interface LeadFilterProps {
  onFiltersChange: (filters: LeadFilters) => void;
  activeFiltersCount?: number;
}

const LeadFilter: React.FC<LeadFilterProps> = ({ onFiltersChange, activeFiltersCount = 0 }) => {
  const [filters, setFilters] = useState<LeadFilters>({});
  const [isExpanded, setIsExpanded] = useState(false);

  const handleServiceTypeChange = (value: string) => {
    const newFilters = { ...filters, serviceType: value === 'all' ? undefined : value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleMinDistanceChange = (value: string) => {
    const newFilters = { ...filters, minDistance: value ? parseFloat(value) : undefined };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleMaxDistanceChange = (value: string) => {
    const newFilters = { ...filters, maxDistance: value ? parseFloat(value) : undefined };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleDateFromChange = (value: string) => {
    const newFilters = { ...filters, dateFrom: value || undefined };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleDateToChange = (value: string) => {
    const newFilters = { ...filters, dateTo: value || undefined };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
    onFiltersChange({});
  };

  return (
    <div className="w-full">
      <Button
        variant="outline"
        size="sm"
        className="relative w-full justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
          {activeFiltersCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </span>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {isExpanded && (
        <div className="mt-3 p-4 bg-card border border-border rounded-xl space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">Filter Leads</h3>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-xs h-auto py-1"
              >
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>
          {/* Service Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Service Type</label>
            <Select
              value={filters.serviceType || 'all'}
              onValueChange={handleServiceTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="rent_agreement">Rent Agreement</SelectItem>
                <SelectItem value="domicile">Domicile</SelectItem>
                <SelectItem value="income_certificate">Income Certificate</SelectItem>
                <SelectItem value="birth_certificate">Birth Certificate</SelectItem>
                <SelectItem value="death_certificate">Death Certificate</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Distance Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Distance (km)</label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={filters.minDistance || ''}
                onChange={(e) => handleMinDistanceChange(e.target.value)}
                min="0"
              />
              <Input
                type="number"
                placeholder="Max"
                value={filters.maxDistance || ''}
                onChange={(e) => handleMaxDistanceChange(e.target.value)}
                min="0"
              />
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Created Date</label>
            <div className="space-y-2">
              <Input
                type="date"
                placeholder="From"
                value={filters.dateFrom || ''}
                onChange={(e) => handleDateFromChange(e.target.value)}
              />
              <Input
                type="date"
                placeholder="To"
                value={filters.dateTo || ''}
                onChange={(e) => handleDateToChange(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadFilter;
