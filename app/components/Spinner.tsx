import React from 'react';

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'medium' }) => {
  const sizeClasses = {
    small: 'h-4 w-4 border-2',
    medium: 'h-8 w-8 border-2',
    large: 'h-12 w-12 border-2'
  };

  return (
    <div
      className={`animate-spin rounded-full border-t-[#25D366] border-r-[#25D366] border-b-[#25D366] border-l-transparent ${sizeClasses[size]}`}
      role="status"
      aria-label="Loading"
    />
  );
}; 