import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

// Types
type SheetSide = 'top' | 'bottom' | 'left' | 'right';

interface SheetContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SheetProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SheetTriggerProps {
  children: React.ReactElement;
  asChild?: boolean;
  [key: string]: any;
}

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  side?: SheetSide;
  className?: string;
}

interface SheetHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

interface SheetFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

interface SheetTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  className?: string;
}

interface SheetDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {
  className?: string;
}

// Sheet Context
const SheetContext = React.createContext<SheetContextType | undefined>(
  undefined
);

// Sheet Root Component
const Sheet: React.FC<SheetProps> = ({ children, open, onOpenChange }) => {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
};

// Sheet Trigger
const SheetTrigger: React.FC<SheetTriggerProps> = ({
  children,
  asChild,
  ...props
}) => {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error('SheetTrigger must be used within a Sheet component');
  }

  const { onOpenChange } = context;

  return React.cloneElement(children, {
    ...props,
    onClick: (e: React.MouseEvent) => {
      onOpenChange(true);
      children.props.onClick?.(e);
    },
  });
};

// Sheet Content
const SheetContent: React.FC<SheetContentProps> = ({
  children,
  side = 'right',
  className = '',
  ...props
}) => {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error('SheetContent must be used within a Sheet component');
  }

  const { open, onOpenChange } = context;

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  const sideClasses: Record<SheetSide, string> = {
    top: 'top-0 left-0 right-0 h-1/3 data-[state=open]:slide-in-from-top-full',
    bottom:
      'bottom-0 left-0 right-0 h-1/3 data-[state=open]:slide-in-from-bottom-full',
    left: 'left-0 top-0 h-full w-3/4 sm:w-80 data-[state=open]:slide-in-from-left-full',
    right:
      'right-0 top-0 h-full w-3/4 sm:w-80 data-[state=open]:slide-in-from-right-full',
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        onClick={() => onOpenChange(false)}
      />

      {/* Sheet */}
      <div
        className={`fixed z-50 gap-4 bg-white p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 ${sideClasses[side]} ${className}`}
        data-state={open ? 'open' : 'closed'}
        {...props}
      >
        {children}
        <button
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:pointer-events-none"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </>
  );
};

// Sheet Header
const SheetHeader: React.FC<SheetHeaderProps> = ({
  className = '',
  ...props
}) => (
  <div
    className={`flex flex-col space-y-2 text-center sm:text-left ${className}`}
    {...props}
  />
);

// Sheet Footer
const SheetFooter: React.FC<SheetFooterProps> = ({
  className = '',
  ...props
}) => (
  <div
    className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className}`}
    {...props}
  />
);

// Sheet Title
const SheetTitle: React.FC<SheetTitleProps> = ({
  className = '',
  ...props
}) => (
  <h2
    className={`text-lg font-semibold text-slate-950 ${className}`}
    {...props}
  />
);

// Sheet Description
const SheetDescription: React.FC<SheetDescriptionProps> = ({
  className = '',
  ...props
}) => <p className={`text-sm text-slate-500 ${className}`} {...props} />;

export {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
