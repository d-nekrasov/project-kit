import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import type { SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type SelectOption = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
};

const EMPTY_VALUE_SENTINEL = '__pk_empty_select_value__';

function extractOptions(children: React.ReactNode): SelectOption[] {
  return React.Children.toArray(children).flatMap((node) => {
    if (!React.isValidElement(node)) {
      return [];
    }

    if (node.type === 'option') {
      const { value, disabled, children: optionChildren } = node.props as {
        value?: string;
        disabled?: boolean;
        children?: React.ReactNode;
      };
      return [{ value: value ?? '', label: optionChildren, disabled }];
    }

    if (node.type === 'optgroup') {
      const { children: optgroupChildren } = node.props as { children?: React.ReactNode };
      return extractOptions(optgroupChildren);
    }

    return [];
  });
}

export function Select({
  className,
  value,
  defaultValue,
  onChange,
  onBlur,
  disabled,
  id,
  name,
  required,
  autoFocus,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
  children,
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const options = React.useMemo(() => extractOptions(children), [children]);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? '');

  React.useEffect(() => {
    if (!isControlled) {
      setInternalValue(defaultValue ?? '');
    }
  }, [defaultValue, isControlled]);

  const currentValue = String(isControlled ? value ?? '' : internalValue);
  const emptyOption = options.find((option) => option.value === '');
  const selectedOption = options.find((option) => option.value === currentValue);
  const selectValue = currentValue === '' ? EMPTY_VALUE_SENTINEL : currentValue;

  const handleValueChange = (nextValue: string) => {
    const normalizedValue = nextValue === EMPTY_VALUE_SENTINEL ? '' : nextValue;

    if (!isControlled) {
      setInternalValue(normalizedValue);
    }

    if (!onChange) {
      return;
    }

    const event = {
      target: { value: normalizedValue, name },
      currentTarget: { value: normalizedValue, name }
    } as unknown as React.ChangeEvent<HTMLSelectElement>;
    onChange(event);
  };

  return (
    <SelectPrimitive.Root value={selectValue} onValueChange={handleValueChange} disabled={disabled} name={name} required={required}>
      <SelectPrimitive.Trigger
        id={id}
        autoFocus={autoFocus}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={cn(
          className,
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-left text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          !selectedOption && 'text-slate-400',
        )}
        onBlur={(event) => onBlur?.(event as unknown as React.FocusEvent<HTMLSelectElement>)}
      >
        <SelectPrimitive.Value className="truncate">
          {selectedOption ? selectedOption.label : emptyOption?.label ?? 'Select...'}
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-[var(--z-floating)] min-w-[8rem] overflow-hidden rounded-md border border-border bg-card shadow-md"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value || '__empty'}
                value={option.value === '' ? EMPTY_VALUE_SENTINEL : option.value}
                disabled={option.disabled}
                className="relative flex cursor-default select-none items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-slate-100"
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2 inline-flex items-center">
                  <Check className="h-4 w-4" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
