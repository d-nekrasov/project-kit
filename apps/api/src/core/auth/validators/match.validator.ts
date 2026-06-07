import {
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from "class-validator";

export function Match<T extends object>(
  property: keyof T,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: "match",
      target: target.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      constraints: [property],
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const [relatedPropertyName] = args.constraints as [keyof T];
          return value === (args.object as T)[relatedPropertyName];
        },
      },
    });
  };
}
