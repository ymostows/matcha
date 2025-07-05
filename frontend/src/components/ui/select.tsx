import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

interface SelectTriggerProps {
  className?: string;
  children: React.ReactNode;
}

interface SelectContentProps {
  children: React.ReactNode;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

interface SelectValueProps {
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({ value, onValueChange, children }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <div className="relative">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { 
            value, 
            onValueChange, 
            isOpen, 
            setIsOpen 
          } as any);
        }
        return child;
      })}
    </div>
  );
};

export const SelectTrigger: React.FC<SelectTriggerProps & any> = ({ 
  className, 
  children, 
  value, 
  isOpen, 
  setIsOpen 
}) => {
  return (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {children}
      <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")} />
    </button>
  );
};

export const SelectContent: React.FC<SelectContentProps & any> = ({ 
  children, 
  isOpen, 
  setIsOpen, 
  onValueChange 
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 top-full mt-1 w-full">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { 
            onValueChange, 
            setIsOpen 
          } as any);
        }
        return child;
      })}
    </div>
  );
};

export const SelectItem: React.FC<SelectItemProps & any> = ({ 
  value, 
  children, 
  onValueChange, 
  setIsOpen 
}) => {
  return (
    <div
      onClick={() => {
        onValueChange(value);
        setIsOpen(false);
      }}
      className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
    >
      {children}
    </div>
  );
};

export const SelectValue: React.FC<SelectValueProps & any> = ({ 
  placeholder, 
  value 
}) => {
  return (
    <span className="text-sm">
      {value || placeholder}
    </span>
  );
}; 