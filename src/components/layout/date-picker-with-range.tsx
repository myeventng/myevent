'use client';

import * as React from 'react';
import { Calendar } from 'lucide-react';

// Mock date formatting functions to avoid external dependencies
const formatDate = (date: Date, format: string) => {
  if (format === 'LLL dd, y') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  }
  if (format === 'PPP') {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  return date.toLocaleDateString();
};

// Simple DateRange interface
interface DateRange {
  from?: Date;
  to?: Date;
}

// Utility function for className concatenation
const cn = (...classes: (string | undefined)[]) => {
  return classes.filter(Boolean).join(' ');
};

// Mock UI components - replace with your actual UI library components
const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'outline' | 'default';
    size?: 'sm' | 'default';
  }
>(({ className, variant = 'default', size = 'default', ...props }, ref) => {
  const baseClasses =
    'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
  };
  const sizeClasses = {
    default: 'h-10 py-2 px-4',
    sm: 'h-9 px-3 rounded-md',
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = 'Button';

const Popover = ({ children }: { children: React.ReactNode }) => {
  return <div className="relative">{children}</div>;
};

const PopoverTrigger = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }
>(({ children, asChild, ...props }, ref) => {
  return (
    <div ref={ref} {...props}>
      {children}
    </div>
  );
});
PopoverTrigger.displayName = 'PopoverTrigger';

const PopoverContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { align?: 'start' | 'center' | 'end' }
>(({ className, align = 'center', ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none',
        align === 'start' ? 'left-0' : undefined,
        align === 'center' ? 'left-1/2 transform -translate-x-1/2' : undefined,
        align === 'end' ? 'right-0' : undefined,
        className
      )}
      {...props}
    />
  );
});
PopoverContent.displayName = 'PopoverContent';

// Simple Calendar component mock
const CalendarComponent = ({
  mode,
  selected,
  onSelect,
  disabled,
  numberOfMonths = 1,
  defaultMonth,
  initialFocus,
}: any) => {
  const [currentDate, setCurrentDate] = React.useState(
    defaultMonth || new Date()
  );

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() =>
            setCurrentDate(
              new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
            )
          }
          className="p-1 hover:bg-gray-100 rounded"
        >
          ←
        </button>
        <span className="font-medium">
          {currentDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })}
        </span>
        <button
          onClick={() =>
            setCurrentDate(
              new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
            )
          }
          className="p-1 hover:bg-gray-100 rounded"
        >
          →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-medium text-gray-500"
          >
            {day}
          </div>
        ))}
        {Array.from({ length: 35 }, (_, i) => {
          const date = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            i - 6
          );
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const isSelected =
            mode === 'range'
              ? (selected?.from &&
                  date.getTime() === selected.from.getTime()) ||
                (selected?.to && date.getTime() === selected.to.getTime())
              : selected && date.getTime() === selected.getTime();

          return (
            <button
              key={i}
              onClick={() =>
                onSelect?.(mode === 'range' ? { from: date, to: date } : date)
              }
              disabled={disabled?.(date) || !isCurrentMonth}
              className={cn(
                'p-2 text-sm rounded hover:bg-gray-100',
                !isCurrentMonth ? 'text-gray-300' : undefined,
                isSelected && 'bg-blue-500 text-white hover:bg-blue-600',
                disabled?.(date) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface DatePickerWithRangeProps {
  className?: string;
  date?: DateRange;
  onSelect: (date: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  numberOfMonths?: number;
}

export function DatePickerWithRange({
  className,
  date,
  onSelect,
  placeholder = 'Pick a date range',
  disabled = false,
  numberOfMonths = 2,
}: DatePickerWithRangeProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={'outline'}
            className={cn(
              'w-full justify-start text-left font-normal',
              !date ? 'text-muted-foreground' : undefined
            )}
            disabled={disabled}
            onClick={() => setIsOpen(!isOpen)}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {formatDate(date.from, 'LLL dd, y')} -{' '}
                  {formatDate(date.to, 'LLL dd, y')}
                </>
              ) : (
                formatDate(date.from, 'LLL dd, y')
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        {isOpen && (
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={(newDate: DateRange) => {
                onSelect(newDate);
                if (newDate?.from && newDate?.to) {
                  setIsOpen(false);
                }
              }}
              numberOfMonths={numberOfMonths}
              disabled={(date: Date) =>
                date > new Date() || date < new Date('1900-01-01')
              }
            />
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
}

// Enhanced DatePicker for analytics use cases
interface DatePickerProps {
  date?: Date;
  onSelect: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  allowPastDates?: boolean;
  allowFutureDates?: boolean;
  maxDate?: Date;
  minDate?: Date;
}

export function DatePicker({
  date,
  onSelect,
  placeholder = 'Pick a date',
  disabled = false,
  allowPastDates = true,
  allowFutureDates = true,
  maxDate,
  minDate,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (minDate && date < minDate) {
      return true;
    }

    if (maxDate && date > maxDate) {
      return true;
    }

    if (!allowPastDates && date < today) {
      return true;
    }

    if (!allowFutureDates && date > today) {
      return true;
    }

    return false;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-full justify-start text-left font-normal',
            !date ? 'text-muted-foreground' : undefined
          )}
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {date ? formatDate(date, 'PPP') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      {isOpen && (
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={date}
            onSelect={(newDate: Date) => {
              onSelect(newDate);
              setIsOpen(false);
            }}
            disabled={isDateDisabled}
          />
        </PopoverContent>
      )}
    </Popover>
  );
}

// Preset date ranges for analytics
export const getDateRangePresets = () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const last7Days = new Date(today);
  last7Days.setDate(last7Days.getDate() - 7);

  const last30Days = new Date(today);
  last30Days.setDate(last30Days.getDate() - 30);

  const last90Days = new Date(today);
  last90Days.setDate(last90Days.getDate() - 90);

  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  const thisYear = new Date(today.getFullYear(), 0, 1);

  return {
    today: { from: today, to: today },
    yesterday: { from: yesterday, to: yesterday },
    last7Days: { from: last7Days, to: today },
    last30Days: { from: last30Days, to: today },
    last90Days: { from: last90Days, to: today },
    thisMonth: { from: thisMonth, to: today },
    lastMonth: { from: lastMonth, to: lastMonthEnd },
    thisYear: { from: thisYear, to: today },
  };
};

// Quick preset buttons component
interface DateRangePresetsProps {
  onSelect: (range: DateRange) => void;
  className?: string;
}

export function DateRangePresets({
  onSelect,
  className,
}: DateRangePresetsProps) {
  const presets = getDateRangePresets();

  const presetOptions = [
    { label: 'Today', value: presets.today },
    { label: 'Yesterday', value: presets.yesterday },
    { label: 'Last 7 days', value: presets.last7Days },
    { label: 'Last 30 days', value: presets.last30Days },
    { label: 'Last 90 days', value: presets.last90Days },
    { label: 'This month', value: presets.thisMonth },
    { label: 'Last month', value: presets.lastMonth },
    { label: 'This year', value: presets.thisYear },
  ];

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {presetOptions.map((preset) => (
        <Button
          key={preset.label}
          variant="outline"
          size="sm"
          onClick={() => onSelect(preset.value)}
          className="text-xs"
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
}
