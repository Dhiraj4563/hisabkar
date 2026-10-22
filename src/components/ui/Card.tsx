import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'bordered';
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-zinc-900/60 border border-zinc-800/60 shadow-xs',
    elevated: 'bg-zinc-900/90 border border-zinc-800/70 shadow-lg shadow-black/30',
    bordered: 'bg-zinc-950 border border-zinc-800/60',
  };

  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 text-zinc-100 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
