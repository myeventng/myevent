'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { X, Star, Trophy, Calendar, Users, Vote } from 'lucide-react';

interface FilterState {
  search: string;
  categoryId: string;
  cityId: string;
  tagIds: string[];
  dateRange: string;
  priceRange: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  featured: boolean;
  // New filters for voting contests
  eventTypes: string[];
  votingStatus: string;
  votingType: string;
}

interface EventsFiltersProps {
  filters: FilterState;
  updateFilter: (key: keyof FilterState, value: any) => void;
  clearAllFilters: () => void;
  filterOptions: {
    categories: Array<{ id: string; name: string }>;
    cities: Array<{ id: string; name: string }>;
    tags: Array<{ id: string; name: string; bgColor: string }>;
  };
  onClose: () => void;
}

export function EventsFilters({
  filters,
  updateFilter,
  clearAllFilters,
  filterOptions,
  onClose,
}: EventsFiltersProps) {
  const toggleTag = (tagId: string) => {
    const currentTags = filters.tagIds;
    if (currentTags.includes(tagId)) {
      updateFilter(
        'tagIds',
        currentTags.filter((id) => id !== tagId)
      );
    } else {
      updateFilter('tagIds', [...currentTags, tagId]);
    }
  };

  const toggleEventType = (eventType: string) => {
    const currentTypes = filters.eventTypes || [];
    if (currentTypes.includes(eventType)) {
      updateFilter(
        'eventTypes',
        currentTypes.filter((type) => type !== eventType)
      );
    } else {
      updateFilter('eventTypes', [...currentTypes, eventType]);
    }
  };

  const hasActiveFilters = () => {
    return (
      filters.categoryId ||
      filters.cityId ||
      filters.tagIds.length > 0 ||
      filters.dateRange ||
      filters.priceRange ||
      filters.featured ||
      (filters.eventTypes && filters.eventTypes.length > 0) ||
      filters.votingStatus ||
      filters.votingType
    );
  };

  return (
    <div className="space-y-6 mt-6">
      {/* Featured Events Toggle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="featured"
            className="text-base font-medium flex items-center gap-2"
          >
            <Star className="h-4 w-4 text-yellow-500" />
            Featured Events Only
          </Label>
          <Switch
            id="featured"
            checked={filters.featured}
            onCheckedChange={(checked) => updateFilter('featured', checked)}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Show only events highlighted by our team
        </p>
      </div>

      <Separator />

      {/* Event Type Filter */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Event Type</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="standard"
              checked={(filters.eventTypes || []).includes('STANDARD')}
              onCheckedChange={() => toggleEventType('STANDARD')}
            />
            <label
              htmlFor="standard"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Standard Events
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="voting-contest"
              checked={(filters.eventTypes || []).includes('VOTING_CONTEST')}
              onCheckedChange={() => toggleEventType('VOTING_CONTEST')}
            />
            <label
              htmlFor="voting-contest"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
            >
              <Trophy className="h-4 w-4 text-purple-600" />
              Voting Contests
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="invite"
              checked={(filters.eventTypes || []).includes('INVITE')}
              onCheckedChange={() => toggleEventType('INVITE')}
            />
            <label
              htmlFor="invite"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
            >
              <Users className="h-4 w-4 text-blue-600" />
              Invite Only
            </label>
          </div>
        </div>
      </div>

      <Separator />

      {/* Voting Contest Specific Filters */}
      {(filters.eventTypes || []).includes('VOTING_CONTEST') && (
        <>
          <div className="space-y-3">
            <Label className="text-base font-medium">Voting Status</Label>
            <Select
              value={filters.votingStatus || ''}
              onValueChange={(value) =>
                updateFilter('votingStatus', value === 'all' ? '' : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="upcoming">Voting Not Started</SelectItem>
                <SelectItem value="active">Voting Active</SelectItem>
                <SelectItem value="ended">Voting Ended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium">Voting Type</Label>
            <Select
              value={filters.votingType || ''}
              onValueChange={(value) =>
                updateFilter('votingType', value === 'all' ? '' : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any type</SelectItem>
                <SelectItem value="FREE">Free Voting</SelectItem>
                <SelectItem value="PAID">Paid Voting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />
        </>
      )}

      {/* Category Filter */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Category</Label>
        <Select
          value={filters.categoryId}
          onValueChange={(value) =>
            updateFilter('categoryId', value === 'all' ? '' : value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {filterOptions.categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* City Filter */}
      <div className="space-y-3">
        <Label className="text-base font-medium">City</Label>
        <Select
          value={filters.cityId}
          onValueChange={(value) =>
            updateFilter('cityId', value === 'all' ? '' : value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cities</SelectItem>
            {filterOptions.cities.map((city) => (
              <SelectItem key={city.id} value={city.id}>
                {city.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Date Range Filter */}
      <div className="space-y-3">
        <Label className="text-base font-medium">When</Label>
        <Select
          value={filters.dateRange}
          onValueChange={(value) =>
            updateFilter('dateRange', value === 'all' ? '' : value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Any time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="tomorrow">Tomorrow</SelectItem>
            <SelectItem value="this_week">This week</SelectItem>
            <SelectItem value="this_month">This month</SelectItem>
            <SelectItem value="next_month">Next month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Price Range Filter - Only show for non-voting contests */}
      {!(filters.eventTypes || []).includes('VOTING_CONTEST') ||
      (filters.eventTypes || []).length > 1 ||
      (filters.eventTypes || []).length === 0 ? (
        <>
          <div className="space-y-3">
            <Label className="text-base font-medium">Price Range</Label>
            <Select
              value={filters.priceRange}
              onValueChange={(value) =>
                updateFilter('priceRange', value === 'all' ? '' : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any price</SelectItem>
                <SelectItem value="free">Free events</SelectItem>
                <SelectItem value="under_5000">Under ₦5,000</SelectItem>
                <SelectItem value="5000_20000">₦5,000 - ₦20,000</SelectItem>
                <SelectItem value="over_20000">Over ₦20,000</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />
        </>
      ) : null}

      {/* Tags Filter */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Tags</Label>
        <p className="text-sm text-muted-foreground">
          Select topics that interest you
        </p>

        {filterOptions.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {filterOptions.tags.map((tag) => {
              const isSelected = filters.tagIds.includes(tag.id);
              return (
                <Badge
                  key={tag.id}
                  variant={isSelected ? 'default' : 'outline'}
                  className="cursor-pointer transition-all hover:scale-105"
                  style={{
                    backgroundColor: isSelected ? tag.bgColor : 'transparent',
                    color: isSelected ? 'white' : tag.bgColor,
                    borderColor: tag.bgColor,
                  }}
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                  {isSelected && <X className="h-3 w-3 ml-1" />}
                </Badge>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No tags available
          </p>
        )}

        {filters.tagIds.length > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {filters.tagIds.length} tag
              {filters.tagIds.length !== 1 ? 's' : ''} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateFilter('tagIds', [])}
              className="h-auto p-1 text-xs"
            >
              Clear tags
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={clearAllFilters}
          disabled={!hasActiveFilters()}
        >
          Clear All Filters
        </Button>

        <Button onClick={onClose} className="w-full">
          Apply Filters
        </Button>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters() && (
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <p className="text-sm font-medium">Active Filters:</p>
          <div className="space-y-1 text-xs text-muted-foreground">
            {filters.categoryId && (
              <div>
                • Category:{' '}
                {
                  filterOptions.categories.find(
                    (c) => c.id === filters.categoryId
                  )?.name
                }
              </div>
            )}
            {filters.cityId && (
              <div>
                • City:{' '}
                {
                  filterOptions.cities.find((c) => c.id === filters.cityId)
                    ?.name
                }
              </div>
            )}
            {filters.eventTypes && filters.eventTypes.length > 0 && (
              <div>
                • Event Types:{' '}
                {filters.eventTypes
                  .map((type) =>
                    type === 'VOTING_CONTEST'
                      ? 'Voting Contests'
                      : type === 'INVITE'
                        ? 'Invite Only'
                        : 'Standard Events'
                  )
                  .join(', ')}
              </div>
            )}
            {filters.votingStatus && (
              <div>
                • Voting Status: {filters.votingStatus.replace('_', ' ')}
              </div>
            )}
            {filters.votingType && (
              <div>
                • Voting Type: {filters.votingType === 'FREE' ? 'Free' : 'Paid'}
              </div>
            )}
            {filters.tagIds.length > 0 && (
              <div>• Tags: {filters.tagIds.length} selected</div>
            )}
            {filters.dateRange && (
              <div>• Date: {filters.dateRange.replace('_', ' ')}</div>
            )}
            {filters.priceRange && (
              <div>• Price: {filters.priceRange.replace('_', ' ')}</div>
            )}
            {filters.featured && <div>• Featured events only</div>}
          </div>
        </div>
      )}
    </div>
  );
}
