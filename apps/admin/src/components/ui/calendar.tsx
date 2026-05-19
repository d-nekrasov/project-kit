import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type CalendarProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

function toMonthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function Calendar({ className, ...props }: CalendarProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => (props.value ? new Date(`${props.value}T00:00:00`) : null), [props.value]);
  const [viewDate, setViewDate] = useState(() => selected ?? new Date());

  useEffect(() => {
    if (selected) {
      setViewDate(selected);
    }
  }, [selected]);

  useEffect(() => {
    function onOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', onOutsideClick);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onOutsideClick);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = daysInMonth(year, month);
  const leading = Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 });
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  function emitValue(nextValue: string) {
    const event = { target: { value: nextValue } } as ChangeEvent<HTMLInputElement>;
    props.onChange?.(event);
  }

  function onSelectDay(day: number) {
    const next = new Date(year, month, day);
    const iso = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
    emitValue(iso);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={cn(
          'h-9 w-full rounded-md border border-input bg-card px-3 text-left text-sm outline-none hover:bg-muted/40',
          className
        )}
        onClick={() => setOpen((value) => !value)}
      >
        {props.value || 'Select date'}
      </button>
      {open ? (
        <div className="absolute left-0 top-10 z-30 w-72 rounded-md border bg-card p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              className="rounded p-1 hover:bg-muted"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="text-sm font-medium capitalize">{toMonthLabel(viewDate)}</div>
            <button
              type="button"
              className="rounded p-1 hover:bg-muted"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((dayLabel) => (
              <div key={dayLabel}>{dayLabel}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {leading.map((_, index) => (
              <div key={`lead-${index}`} className="h-8" />
            ))}
            {days.map((day) => {
              const isSelected =
                selected &&
                selected.getFullYear() === year &&
                selected.getMonth() === month &&
                selected.getDate() === day;
              return (
                <button
                  key={day}
                  type="button"
                  className={cn(
                    'h-8 rounded text-sm hover:bg-muted',
                    isSelected ? 'bg-slate-900 text-white hover:bg-slate-900' : 'text-foreground/80'
                  )}
                  onClick={() => onSelectDay(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
