import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-background',
  {
    variants: {
      variant: {
        // shadcn standard
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'bg-transparent hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        // aliases for backward compatibility
        solid: 'bg-primary text-primary-foreground hover:bg-primary/90',
      },
      size: {
        sm: 'h-8 px-2.5 text-xs',
        md: 'h-9 px-3 text-sm', // default
        lg: 'h-10 px-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

const Button = React.forwardRef(function Button(
  { className, variant = 'solid', size = 'md', type = 'button', ...props },
  ref
) {
  // Map legacy variant to shadcn default
  const resolvedVariant = variant === 'solid' ? 'default' : variant;
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant: resolvedVariant, size }), className)}
      {...props}
    />
  );
});

export default Button;
