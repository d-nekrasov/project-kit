import {
  cloneElement,
  createContext,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useContext,
  useState,
  type PropsWithChildren,
  type ReactElement
} from 'react';

import { cn } from '@/lib/utils';

type DropdownMenuContextValue = {
  id: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  rootRef: React.RefObject<HTMLDivElement | null>;
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
  const id = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onAnyOpen(event: Event) {
      const customEvent = event as CustomEvent<{ id: string }>;
      if (customEvent.detail.id !== id) {
        setOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', onOutsideClick);
    document.addEventListener('dropdown-menu:open', onAnyOpen as EventListener);
    document.addEventListener('keydown', onEscape);

    return () => {
      document.removeEventListener('mousedown', onOutsideClick);
      document.removeEventListener('dropdown-menu:open', onAnyOpen as EventListener);
      document.removeEventListener('keydown', onEscape);
    };
  }, [id]);

  return (
    <DropdownMenuContext.Provider value={{ id, open, setOpen, rootRef }}>
      <div ref={rootRef} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({ children }: { children: ReactElement }) {
  const { id, open, setOpen } = useDropdownMenu();

  if (!isValidElement(children)) {
    return null;
  }

  const childProps = children.props as { onClick?: () => void };

  return cloneElement(children, {
    'aria-expanded': open,
    'aria-haspopup': 'menu',
    onClick: () => {
      childProps.onClick?.();
      if (!open) {
        document.dispatchEvent(new CustomEvent('dropdown-menu:open', { detail: { id } }));
      }
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
  onClick,
  disabled
}: PropsWithChildren<{ className?: string; onClick?: () => void; disabled?: boolean }>) {
  const { setOpen } = useDropdownMenu();

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) {
          return;
        }
        onClick?.();
        setOpen(false);
      }}
      className={cn(
        'inline-flex w-full items-center gap-2 whitespace-nowrap rounded-sm px-2 py-1.5 text-left text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      role="menuitem"
    >
      {children}
    </button>
  );
}
