import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { forwardRef, type InputHTMLAttributes } from 'react';
import type * as React from 'react';

import { cn } from '@/lib/utils';

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      checked,
      defaultChecked,
      disabled,
      onChange,
      onBlur,
      name,
      value,
      required,
      id,
      autoFocus,
      'aria-invalid': ariaInvalid,
      'aria-describedby': ariaDescribedBy
    },
    ref
  ) => (
    <CheckboxPrimitive.Root
      id={id}
      checked={checked}
      defaultChecked={defaultChecked}
      disabled={disabled}
      required={required}
      name={name}
      autoFocus={autoFocus}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      value={typeof value === 'string' ? value : undefined}
      onBlur={(event) => onBlur?.(event as unknown as React.FocusEvent<HTMLInputElement>)}
      onCheckedChange={(nextChecked) => {
        if (!onChange) {
          return;
        }

        const boolValue = nextChecked === true;
        const event = {
          target: { checked: boolValue, name, value },
          currentTarget: { checked: boolValue, name, value }
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        onChange(event);
      }}
      className={cn(
        'peer h-4 w-4 shrink-0 rounded-[4px] border border-slate-300 bg-white shadow-xs transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-slate-900 data-[state=checked]:bg-slate-900',
        className
      )}
      ref={ref as unknown as React.Ref<HTMLButtonElement>}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
        <Check className="h-3.5 w-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
);
Checkbox.displayName = 'Checkbox';
