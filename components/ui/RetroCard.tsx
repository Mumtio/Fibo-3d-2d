import React from 'react';

interface RetroCardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  variant?: 'mac' | 'soft' | 'hollow';
}

export const RetroCard: React.FC<RetroCardProps> = ({ children, title, className = '', variant = 'mac' }) => {
  
  if (variant === 'mac') {
    return (
      <div className={`bg-retro-base border-2 border-t-white border-l-white border-b-retro-border border-r-retro-border shadow-retro flex flex-col ${className}`}>
        {title && (
          <div className="bg-gradient-to-r from-blue-800 to-blue-600 px-2 py-1 flex items-center justify-between border-b border-retro-border flex-shrink-0">
            <span className="font-retro text-white text-lg tracking-wide">{title}</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-retro-base border border-gray-500 shadow-sm"></div>
              <div className="w-3 h-3 bg-retro-base border border-gray-500 shadow-sm"></div>
            </div>
          </div>
        )}
        <div className="p-4 flex-1 flex flex-col min-h-0">
          {children}
        </div>
      </div>
    );
  }

  if (variant === 'soft') {
    return (
      <div className={`bg-white rounded-xl border-2 border-black shadow-float transition-transform hover:-translate-y-1 flex flex-col ${className}`}>
        {title && <h3 className="font-bold text-xl mb-2 px-4 pt-4 flex-shrink-0">{title}</h3>}
        <div className="p-4 flex-1 flex flex-col min-h-0">
          {children}
        </div>
      </div>
    );
  }

  // Hollow/dashed style
  return (
    <div className={`border-4 border-dashed border-gray-300 rounded-xl bg-gray-50/50 flex flex-col ${className}`}>
      <div className="flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
};