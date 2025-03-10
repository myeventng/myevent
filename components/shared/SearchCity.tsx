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

interface City {
  id: string;
  name: string;
  state: string;
}

interface SearchableCitySelectProps {
  cities: City[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  error?: string;
}

const SearchableCitySelect = ({
  cities,
  value,
  onChange,
  disabled = false,
  label = 'City',
  placeholder = 'Search and select a city',
  error,
}: SearchableCitySelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCities, setFilteredCities] = useState<City[]>(cities);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get the selected city display name
  const selectedCity = cities.find((city) => city.id === value);
  const displayValue = selectedCity
    ? `${selectedCity.name}, ${selectedCity.state}`
    : '';

  // Filter cities based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCities(cities);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = cities.filter(
        (city) =>
          city.name.toLowerCase().includes(query) ||
          city.state.toLowerCase().includes(query)
      );
      setFilteredCities(filtered);
    }
  }, [searchQuery, cities]);

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

  // Handle select city
  const handleSelectCity = (cityId: string) => {
    onChange(cityId);
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
              placeholder="Search cities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full focus:ring-2"
              autoFocus
            />
          </div>

          <div className="max-h-72 overflow-y-auto">
            {filteredCities.length > 0 ? (
              filteredCities.map((city) => (
                <div
                  key={city.id}
                  className={cn(
                    'px-4 py-2 cursor-pointer flex items-center justify-between hover:bg-gray-100',
                    city.id === value && 'bg-primary/10'
                  )}
                  onClick={() => handleSelectCity(city.id)}
                >
                  <span>
                    {city.name}, {city.state}
                  </span>
                  {city.id === value && (
                    <Check size={16} className="text-primary" />
                  )}
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-gray-500">No cities found</div>
            )}
          </div>
        </div>
      )}

      {error && <div className="text-sm text-red-500 mt-1">{error}</div>}
    </div>
  );
};

interface FormFieldSearchableSelectProps extends SearchableCitySelectProps {
  control: any;
  name: string;
}

// Form field adapter for react-hook-form integration
export const FormFieldSearchableSelect = ({
  control,
  name,
  cities,
  label = 'City',
  placeholder = 'Search and select a city',
  disabled = false,
}: FormFieldSearchableSelectProps) => {
  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <FormControl>
        <SearchableCitySelect
          cities={cities}
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

export default SearchableCitySelect;
