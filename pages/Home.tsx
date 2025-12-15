import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BevelButton } from '../components/ui/BevelButton';
import { Box, Ghost } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const Home: React.FC = () => {
  const { setTab, setMode } = useAppStore();
  const navigate = useNavigate();

  const handleSelect = (mode: '3D' | 'SPRITE') => {
    setMode(mode);
    setTab('generate');
    navigate('/generate');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center space-y-12">
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 max-w-2xl"
      >
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 leading-[1.1]">
          Create <span className="text-pastel-pink bg-black px-2 skew-x-[-6deg] inline-block">3D Models</span> & <span className="text-pastel-mint bg-black px-2 skew-x-[6deg] inline-block">2D Sprites</span> From One Prompt.
        </h1>
        <p className="text-xl text-gray-600 font-medium">
          The retro-modern generator for game assets. Powered by GenAI.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
        <motion.div 
          whileHover={{ scale: 1.05 }}
          onClick={() => handleSelect('3D')}
          className="cursor-pointer group relative bg-cream border-4 border-black rounded-3xl p-8 shadow-float hover:shadow-none transition-all"
        >
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-pastel-yellow border-2 border-black rounded-full p-4">
             <Box size={48} />
          </div>
          <div className="mt-8 space-y-4">
            <h2 className="text-3xl font-bold group-hover:text-pastel-pink transition-colors">3D Generator</h2>
            <p className="text-gray-500">Generate GLB assets, optimized meshes, and ready-to-game models.</p>
            <div className="inline-block bg-gray-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              Format: .GLB .OBJ
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.05 }}
          onClick={() => handleSelect('SPRITE')}
          className="cursor-pointer group relative bg-cream border-4 border-black rounded-3xl p-8 shadow-float hover:shadow-none transition-all"
        >
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-pastel-mint border-2 border-black rounded-full p-4">
             <Ghost size={48} />
          </div>
          <div className="mt-8 space-y-4">
            <h2 className="text-3xl font-bold group-hover:text-pastel-mint transition-colors">Sprite Generator</h2>
            <p className="text-gray-500">Create cohesive sprite sheets, idle animations, and pixel art.</p>
            <div className="inline-block bg-gray-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              Format: .PNG .GIF
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};