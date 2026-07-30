import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
}

export function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
  let baseStyle = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';
  let variantStyle = '';
  switch (variant) {
    case 'secondary':
      variantStyle = 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700';
      break;
    case 'destructive':
      variantStyle = 'bg-red-900/40 text-red-400 border border-red-800/60';
      break;
    case 'success':
      variantStyle = 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60';
      break;
    case 'outline':
      variantStyle = 'text-zinc-300 border border-zinc-700';
      break;
    default:
      variantStyle = 'bg-emerald-600 text-white hover:bg-emerald-500';
      break;
  }

  return <div className={`${baseStyle} ${variantStyle} ${className}`} {...props} />;
}
