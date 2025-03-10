'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';

interface Venue {
  id: string;
  name: string;
  address: string;
  city?: {
    name: string;
  };
}

interface SearchableVenueSelectProps {
  venues: Venue[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  error?: string;
}

const SearchableVenueSelect = ({
  venues,
  value,
  onChange,
  disabled = false,
  label = 'Venue',
  placeholder = 'Search and select a venue',
  error,
}: SearchableVenueSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>(venues);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get the selected venue display name
  const selectedVenue = venues.find((venue) => venue.id === value);
  const displayValue = selectedVenue
    ? `${selectedVenue.name}${
        selectedVenue.city ? ` - ${selectedVenue.city.name}` : ''
      }`
    : '';

  // Filter venues based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredVenues(venues);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = venues.filter(
        (venue) =>
          venue.name.toLowerCase().includes(query) ||
          venue.address.toLowerCase().includes(query) ||
          venue.city?.name.toLowerCase().includes(query)
      );
      setFilteredVenues(filtered);
    }
  }, [searchQuery, venues]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Handle select venue
  const handleSelectVenue = (venueId: string) => {
    onChange(venueId);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Clear selection
  const handleClearSelection = () => {
    onChange('');
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {label && <div className="text-sm font-medium mb-2">{label}</div>}

      <div className="relative">
        <Button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className={cn(
            'w-full justify-between text-left font-normal',
            disabled && 'opacity-50 cursor-not-allowed',
            isOpen && 'ring-2 ring-ring ring-offset-2',
            error && 'border-red-500'
          )}
          disabled={disabled}
        >
          {displayValue || placeholder}

          <div className="ml-auto flex items-center gap-1">
            {value && (
              <X
                size={16}
                className="opacity-70 hover:opacity-100 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearSelection();
                }}
              />
            )}
            <ChevronsUpDown size={16} className="opacity-50" />
          </div>
        </Button>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full bg-white rounded-md border border-gray-200 shadow-lg mt-1 max-h-96 overflow-hidden">
          <div className="p-2 border-b">
            <Input
              placeholder="Search venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full focus:ring-2"
              autoFocus
            />
          </div>

          <div className="max-h-72 overflow-y-auto">
            {filteredVenues.length > 0 ? (
              filteredVenues.map((venue) => (
                <div
                  key={venue.id}
                  className={cn(
                    'px-4 py-2 cursor-pointer flex items-center justify-between hover:bg-gray-100',
                    venue.id === value && 'bg-primary/10'
                  )}
                  onClick={() => handleSelectVenue(venue.id)}
                >
                  <div>
                    <div className="font-medium">{venue.name}</div>
                    <div className="text-xs text-gray-500">{venue.address}</div>
                    {venue.city && (
                      <div className="text-xs text-gray-500">
                        {venue.city.name}
                      </div>
                    )}
                  </div>
                  {venue.id === value && (
                    <Check size={16} className="text-primary" />
                  )}
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-gray-500">No venues found</div>
            )}
          </div>
        </div>
      )}

      {error && <div className="text-sm text-red-500 mt-1">{error}</div>}
    </div>
  );
};

// Form field adapter for react-hook-form integration
export const FormFieldSearchableVenueSelect = ({
  control,
  name,
  venues,
  label = 'Venue',
  placeholder = 'Search and select a venue',
  disabled = false,
}: {
  control: any;
  name: string;
  venues: Venue[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}) => {
  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <FormControl>
        <SearchableVenueSelect
          venues={venues}
          value={control._formValues[name] || ''}
          onChange={(value) => control._updateFieldAndValidate(name, value)}
          disabled={disabled}
          placeholder={placeholder}
          error={control._formState.errors[name]?.message}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
};

export default SearchableVenueSelect;
