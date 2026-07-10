import { type ButtonHTMLAttributes, forwardRef } from 'react';

const variants = {
  default: 'bg-pink-500 text-zinc-950 hover:bg-pink-400',
  secondary: 'bg-zinc-900 text-zinc-300 ring-1 ring-zinc-800 hover:bg-zinc-800 hover:text-zinc-100',
  ghost: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60',
  destructive: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20 hover:bg-red-500/20',
  outline: 'bg-transparent text-zinc-300 ring-1 ring-zinc-800 hover:ring-zinc-700',
};

const sizes = {
  sm: 'px-2.5 py-1 text-xs rounded-md',
  md: 'px-3.5 py-1.5 text-sm rounded-lg',
  lg: 'px-5 py-2.5 text-sm rounded-xl',
  icon: 'w-8 h-8 grid place-items-center rounded-lg',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'md', className = '', ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-1.5 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-pink-500/60 focus-visible:outline-none disabled:opacity-40 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  )
);
Button.displayName = 'Button';
