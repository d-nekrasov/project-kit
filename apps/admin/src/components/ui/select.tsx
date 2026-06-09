import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type LegacyOption = {
  type: 'option';
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
};

type LegacyGroup = {
  type: 'group';
  label?: React.ReactNode;
  options: LegacyOption[];
};

const EMPTY_VALUE_SENTINEL = '__pk_empty_select_value__';

function extractLegacyOptions(children: React.ReactNode): LegacyGroup[] {
  return React.Children.toArray(children).reduce<LegacyGroup[]>((result, node) => {
    if (!React.isValidElement(node)) {
      return result;
    }

    if (node.type === 'option') {
      const { value, disabled, children: optionChildren } = node.props as {
        value?: string;
        disabled?: boolean;
        children?: React.ReactNode;
      };

      result.push(
        {
          type: 'group',
          options: [{ type: 'option', value: value ?? '', label: optionChildren, disabled }]
        }
      );
      return result;
    }

    if (node.type === 'optgroup') {
      const { label, children: optgroupChildren } = node.props as {
        label?: React.ReactNode;
        children?: React.ReactNode;
      };

      const groupOptions = extractLegacyOptions(optgroupChildren).flatMap((group) => group.options);
      result.push({ type: 'group', label, options: groupOptions });
      return result;
    }

    return result;
  }, []);
}

const SelectRoot = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-10 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-left text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-slate-400',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn('flex cursor-default items-center justify-center py-1', className)}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn('flex cursor-default items-center justify-center py-1', className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        'z-[130] max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-border bg-card shadow-md',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        className
      )}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          'p-1',
          position === 'popper' &&
            'h-[var(--radix-select-trigger-height)] min-w-[var(--radix-select-trigger-width)] w-full'
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label ref={ref} className={cn('px-2 py-1.5 text-sm font-semibold', className)} {...props} />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-slate-100',
      className
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <SelectPrimitive.ItemIndicator className="absolute right-2 inline-flex items-center">
      <Check className="h-4 w-4" />
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

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
  children
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const groups = React.useMemo(() => extractLegacyOptions(children), [children]);
  const options = React.useMemo(() => groups.flatMap((group) => group.options), [groups]);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? '');

  React.useEffect(() => {
    if (!isControlled) {
      setInternalValue(defaultValue ?? '');
    }
  }, [defaultValue, isControlled]);

  const currentValue = String(isControlled ? value ?? '' : internalValue);
  const hasEmptyOption = options.some((option) => option.value === '');
  const emptyOption = options.find((option) => option.value === '');
  const rootValue = currentValue === '' ? (hasEmptyOption ? EMPTY_VALUE_SENTINEL : undefined) : currentValue;
  const rootDefaultValue = !isControlled
    ? String(defaultValue ?? '') === ''
      ? hasEmptyOption
        ? EMPTY_VALUE_SENTINEL
        : undefined
      : String(defaultValue)
    : undefined;

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
    <SelectRoot
      value={rootValue}
      defaultValue={rootDefaultValue}
      onValueChange={handleValueChange}
      disabled={disabled}
      name={name}
      required={required}
    >
      <SelectTrigger
        id={id}
        autoFocus={autoFocus}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={className}
        onBlur={(event) => onBlur?.(event as unknown as React.FocusEvent<HTMLSelectElement>)}
      >
        <SelectValue placeholder={emptyOption ? emptyOption.label : 'Select...'} />
      </SelectTrigger>
      <SelectContent>
        {groups.map((group, groupIndex) => (
          <SelectGroup key={`${String(group.label ?? 'group')}-${groupIndex}`}>
            {group.label ? <SelectLabel>{group.label}</SelectLabel> : null}
            {group.options.map((option) => (
              <SelectItem
                key={`${option.value || EMPTY_VALUE_SENTINEL}-${String(option.label)}`}
                value={option.value === '' ? EMPTY_VALUE_SENTINEL : option.value}
                disabled={option.disabled}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </SelectRoot>
  );
}

export {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectRoot,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue
};
