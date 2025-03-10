'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DateTimePickerProps {
  date: Date;
  setDate: (date: Date) => void;
  disabled?: boolean;
}

export function DateTimePicker({
  date,
  setDate,
  disabled = false,
}: DateTimePickerProps) {
  // Generate hours and minutes options
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  // Extract current hours and minutes
  const selectedHours = date.getHours();
  const selectedMinutes = date.getMinutes();

  // Handle time change
  const handleTimeChange = (type: 'hours' | 'minutes', value: string) => {
    const newDate = new Date(date);

    if (type === 'hours') {
      newDate.setHours(parseInt(value));
    } else {
      newDate.setMinutes(parseInt(value));
    }

    setDate(newDate);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          disabled={disabled}
        >
          <div className="flex items-center">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, 'PPP HH:mm') : <span>Pick a date</span>}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            if (selectedDate) {
              const newDate = new Date(selectedDate);
              newDate.setHours(selectedHours);
              newDate.setMinutes(selectedMinutes);
              setDate(newDate);
            }
          }}
          initialFocus
          disabled={disabled}
        />
        <div className="p-3 border-t flex items-center justify-between">
          <Clock className="h-4 w-4 opacity-50 mr-2" />
          <div className="flex items-center gap-2">
            <Select
              value={selectedHours.toString()}
              onValueChange={(value) => handleTimeChange('hours', value)}
              disabled={disabled}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue placeholder="HH" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {hours.map((hour) => (
                  <SelectItem key={hour} value={hour.toString()}>
                    {hour.toString().padStart(2, '0')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>:</span>
            <Select
              value={selectedMinutes.toString()}
              onValueChange={(value) => handleTimeChange('minutes', value)}
              disabled={disabled}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue placeholder="MM" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {minutes.map((minute) => (
                  <SelectItem key={minute} value={minute.toString()}>
                    {minute.toString().padStart(2, '0')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
