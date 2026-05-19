import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useState,
  type PropsWithChildren,
  type ReactElement
} from 'react';

import { cn } from '@/lib/utils';

type DropdownMenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenu() {
  const context = useContext(DropdownMenuContext);
  if (!context) {
    throw new Error('DropdownMenu components must be used inside DropdownMenu');
  }

  return context;
}

export function DropdownMenu({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block text-left">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({ children }: { children: ReactElement }) {
  const { open, setOpen } = useDropdownMenu();

  if (!isValidElement(children)) {
    return null;
  }

  const childProps = children.props as { onClick?: () => void };

  return cloneElement(children, {
    'aria-expanded': open,
    'aria-haspopup': 'menu',
    onClick: () => {
      childProps.onClick?.();
      setOpen(!open);
    }
  } as Partial<typeof children.props>);
}

export function DropdownMenuContent({ children, className }: PropsWithChildren<{ className?: string }>) {
  const { open } = useDropdownMenu();

  if (!open) {
    return null;
  }

  return (
    <div className={cn('absolute right-0 z-20 mt-2 min-w-44 rounded-md border bg-white p-1 shadow', className)} role="menu">
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  children,
  className,
  onClick
}: PropsWithChildren<{ className?: string; onClick?: () => void }>) {
  const { setOpen } = useDropdownMenu();

  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        setOpen(false);
      }}
      className={cn('block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-slate-100', className)}
      role="menuitem"
    >
      {children}
    </button>
  );
}
