import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingDisplayProps {
  rating: number;
  maxRating?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showValue?: boolean;
  showCount?: boolean;
  count?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  className?: string;
  precision?: 'full' | 'half' | 'quarter';
  variant?: 'default' | 'outline' | 'ghost';
  color?: 'yellow' | 'orange' | 'red' | 'blue' | 'green';
  readonly?: boolean;
}

export function RatingDisplay({
  rating,
  maxRating = 5,
  size = 'sm',
  showValue = false,
  showCount = false,
  count,
  interactive = false,
  onRatingChange,
  className,
  precision = 'full',
  variant = 'default',
  color = 'yellow',
  readonly = false,
}: RatingDisplayProps) {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8',
  };

  const colorClasses = {
    yellow: {
      filled: 'fill-yellow-400 text-yellow-400',
      empty: 'fill-muted stroke-muted-foreground',
      hover: 'hover:fill-yellow-300 hover:text-yellow-300',
    },
    orange: {
      filled: 'fill-orange-400 text-orange-400',
      empty: 'fill-muted stroke-muted-foreground',
      hover: 'hover:fill-orange-300 hover:text-orange-300',
    },
    red: {
      filled: 'fill-red-400 text-red-400',
      empty: 'fill-muted stroke-muted-foreground',
      hover: 'hover:fill-red-300 hover:text-red-300',
    },
    blue: {
      filled: 'fill-blue-400 text-blue-400',
      empty: 'fill-muted stroke-muted-foreground',
      hover: 'hover:fill-blue-300 hover:text-blue-300',
    },
    green: {
      filled: 'fill-green-400 text-green-400',
      empty: 'fill-muted stroke-muted-foreground',
      hover: 'hover:fill-green-300 hover:text-green-300',
    },
  };

  const starSize = sizeClasses[size];
  const colors = colorClasses[color];

  const handleStarClick = (starRating: number) => {
    if (interactive && !readonly && onRatingChange) {
      onRatingChange(starRating);
    }
  };

  const handleStarHover = (starRating: number) => {
    if (interactive && !readonly) {
      // You can add hover state management here if needed
    }
  };

  // Calculate precise star fill based on precision
  const getStarFillPercentage = (starIndex: number): number => {
    const starValue = starIndex + 1;

    if (rating >= starValue) {
      return 100; // Fully filled
    }

    if (rating <= starIndex) {
      return 0; // Empty
    }

    // Partial fill
    const fillAmount = rating - starIndex;

    switch (precision) {
      case 'half':
        return fillAmount >= 0.5 ? 50 : 0;
      case 'quarter':
        if (fillAmount >= 0.75) return 75;
        if (fillAmount >= 0.5) return 50;
        if (fillAmount >= 0.25) return 25;
        return 0;
      case 'full':
      default:
        return Math.round(fillAmount * 100);
    }
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Stars */}
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxRating }, (_, index) => {
          const starValue = index + 1;
          const fillPercentage = getStarFillPercentage(index);
          const isFilled = fillPercentage === 100;
          const isEmpty = fillPercentage === 0;
          const isPartial = fillPercentage > 0 && fillPercentage < 100;

          return (
            <div
              key={index}
              className={cn(
                'relative',
                interactive && !readonly && 'cursor-pointer'
              )}
              onClick={() => handleStarClick(starValue)}
              onMouseEnter={() => handleStarHover(starValue)}
            >
              {/* Base star (empty) */}
              <Star
                className={cn(starSize, 'transition-all duration-200', {
                  [colors.empty]: isEmpty || isPartial,
                  [colors.filled]: isFilled,
                  'hover:scale-110': interactive && !readonly,
                  [colors.hover]: interactive && !readonly,
                })}
              />

              {/* Partial fill overlay */}
              {isPartial && (
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{
                    width: `${fillPercentage}%`,
                  }}
                >
                  <Star className={cn(starSize, colors.filled)} />
                </div>
              )}

              {/* Outline variant */}
              {variant === 'outline' && (
                <Star
                  className={cn(
                    starSize,
                    'absolute inset-0 fill-transparent stroke-2',
                    isFilled ? colors.filled : colors.empty
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Rating Value */}
      {showValue && (
        <span
          className={cn(
            'font-medium ml-1',
            size === 'xs' ? 'text-xs' : size === 'sm' ? 'text-sm' : 'text-base'
          )}
        >
          {rating.toFixed(1)}
          {maxRating !== 5 && (
            <span className="text-muted-foreground">/{maxRating}</span>
          )}
        </span>
      )}

      {/* Count */}
      {showCount && count !== undefined && (
        <span
          className={cn(
            'text-muted-foreground ml-1',
            size === 'xs' ? 'text-xs' : 'text-sm'
          )}
        >
          ({count} review{count !== 1 ? 's' : ''})
        </span>
      )}
    </div>
  );
}

interface CompactRatingProps {
  rating: number;
  count?: number;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
  color?: 'yellow' | 'orange' | 'red' | 'blue' | 'green';
  showCount?: boolean;
}

export function CompactRating({
  rating,
  count,
  className,
  size = 'sm',
  color = 'yellow',
  showCount = true,
}: CompactRatingProps) {
  // Don't render if no rating and no count
  if (rating === 0 && (!count || count === 0)) {
    return null;
  }

  const sizeClasses = {
    xs: { star: 'h-3 w-3', text: 'text-xs' },
    sm: { star: 'h-3.5 w-3.5', text: 'text-sm' },
    md: { star: 'h-4 w-4', text: 'text-base' },
  };

  const colorClasses = {
    yellow: 'fill-yellow-400 text-yellow-400',
    orange: 'fill-orange-400 text-orange-400',
    red: 'fill-red-400 text-red-400',
    blue: 'fill-blue-400 text-blue-400',
    green: 'fill-green-400 text-green-400',
  };

  const { star: starClass, text: textClass } = sizeClasses[size];

  return (
    <div className={cn('flex items-center gap-1', textClass, className)}>
      <Star className={cn(starClass, colorClasses[color])} />
      <span className="font-medium">{rating.toFixed(1)}</span>
      {showCount && count !== undefined && count > 0 && (
        <span className="text-muted-foreground">({count})</span>
      )}
    </div>
  );
}
