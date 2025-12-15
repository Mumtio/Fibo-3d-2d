import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { RetroCard } from '../components/ui/RetroCard';
import { BevelButton } from '../components/ui/BevelButton';
import { Asset } from '../types';

export const Library: React.FC = () => {
  const { assets, setCurrentResult, setMode, setTab, setPrompt } = useAppStore();
  const navigate = useNavigate();

  const handleAssetClick = (asset: Asset) => {
    setCurrentResult(asset);
    setMode(asset.type);
    setPrompt(asset.prompt);
    setTab('generate');
    navigate('/generate');
  };
  
  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex justify-between items-end mb-8 border-b-4 border-black pb-4">
        <div>
           <h1 className="text-4xl font-extrabold mb-2">Asset Archive</h1>
           <p className="font-retro text-gray-600">Total generated: {assets.length}</p>
        </div>
        <div className="flex gap-2">
          <BevelButton label="Filter: All" variant="ghost" />
          <BevelButton label="3D Only" variant="ghost" />
          <BevelButton label="Sprite Only" variant="ghost" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {assets.map((asset) => (
          <div key={asset.id} onClick={() => handleAssetClick(asset)} className="cursor-pointer">
            <RetroCard variant="soft" className="p-0 overflow-hidden group hover:ring-4 hover:ring-pastel-pink transition-all">
              <div className="bg-gray-200 aspect-square relative overflow-hidden border-b-2 border-black">
                <img 
                  src={asset.thumbnailUrl} 
                  alt={asset.prompt} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 image-pixelated" 
                />
                <div className="absolute top-2 right-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded border border-black shadow-sm ${asset.type === '3D' ? 'bg-pastel-pink' : 'bg-pastel-mint'}`}>
                    {asset.type}
                  </span>
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="bg-white border-2 border-black px-3 py-1 font-retro font-bold shadow-retro transform scale-90 group-hover:scale-100 transition-transform">
                    OPEN VIEWER
                  </span>
                </div>
              </div>
              <div className="p-4 bg-white">
                <p className="font-bold text-sm truncate mb-2">{asset.prompt}</p>
                <div className="flex justify-between items-center text-xs text-gray-500 font-retro">
                  <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                  <span className="group-hover:text-black group-hover:underline">DETAILS &rarr;</span>
                </div>
              </div>
            </RetroCard>
          </div>
        ))}
      </div>
    </div>
  );
};