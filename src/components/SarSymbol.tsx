import React from 'react';

interface SarSymbolProps {
  className?: string;
}

export const SarSymbol: React.FC<SarSymbolProps> = ({ className }) => {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      <span className="font-serif font-black">﷼</span>
    </span>
  );
};
