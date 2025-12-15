import React from 'react';
import { motion } from 'framer-motion';

interface BevelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  label: string;
  icon?: React.ReactNode;
}

export const BevelButton: React.FC<BevelButtonProps> = ({ variant = 'primary', label, icon, className, ...props }) => {
  
  const getBaseStyles = () => {
    switch(variant) {
      case 'primary': return 'bg-pastel-pink text-black border-black';
      case 'secondary': return 'bg-pastel-mint text-black border-black';
      case 'danger': return 'bg-red-400 text-white border-black';
      case 'ghost': return 'bg-transparent border-transparent shadow-none hover:bg-black/5';
      default: return 'bg-retro-base border-retro-border';
    }
  };

  const isGhost = variant === 'ghost';

  return (
    <motion.button
      whileHover={!isGhost ? { scale: 1.02, y: -2 } : {}}
      whileTap={!isGhost ? { scale: 0.95, y: 0 } : {}}
      className={`
        relative px-6 py-2 font-bold flex items-center justify-center gap-2
        ${!isGhost ? 'border-2 rounded-full shadow-retro active:shadow-retro-pressed active:border-t-black' : ''}
        ${getBaseStyles()}
        ${className}
      `}
      {...props}
    >
      {icon && <span className="w-5 h-5">{icon}</span>}
      <span className="font-sans uppercase tracking-wider text-sm">{label}</span>
    </motion.button>
  );
};