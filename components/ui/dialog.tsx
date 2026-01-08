"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const DialogContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>({
  open: false,
  onOpenChange: () => {},
});

const Dialog = ({ open = false, onOpenChange, children }: DialogProps) => {
  return (
    <DialogContext.Provider value={{ open, onOpenChange: onOpenChange || (() => {}) }}>
      {children}
    </DialogContext.Provider>
  );
};

const DialogTrigger = ({
  children,
  asChild,
  ...props
}: {
  children: React.ReactNode;
  asChild?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) => {
  const { onOpenChange } = React.useContext(DialogContext);
  return (
    <div onClick={() => onOpenChange(true)} {...props}>
      {children}
    </div>
  );
};

const DialogContent = ({
  children,
  className,
  ...props
}: DialogContentProps) => {
  const { open, onOpenChange } = React.useContext(DialogContext);

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={() => onOpenChange(false)}
    >
      <div className="fixed inset-0 bg-black/50" />
      <div
        className={cn(
          "relative z-50 w-full max-w-lg mx-4 bg-white rounded-2xl shadow-xl p-6 animate-in fade-in-0 zoom-in-95",
          className
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity text-pink-400 hover:text-pink-600"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
};

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props}
  />
);

const DialogTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2
    className={cn("text-2xl font-semibold text-pink-600", className)}
    {...props}
  />
);

const DialogDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-gray-600", className)} {...props} />
);

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
};
