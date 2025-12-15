import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Download, Image as ImageIcon, Film, ChevronRight, ChevronLeft } from 'lucide-react';

interface SpriteAnimatorProps {
  gifUrl: string;
  sheetUrl: string;
  frameCount?: number;
  frameWidth?: number;
  frameHeight?: number;
}

export const SpriteAnimator: React.FC<SpriteAnimatorProps> = ({ 
  gifUrl, 
  sheetUrl, 
  frameCount = 6,
  frameWidth,
  frameHeight 
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [viewMode, setViewMode] = useState<'preview' | 'sheet'>('preview');
  const [imgError, setImgError] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [sheetDimensions, setSheetDimensions] = useState<{ width: number; height: number } | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load sprite sheet and extract frames
  useEffect(() => {
    if (!sheetUrl) return;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setSheetDimensions({ width: img.width, height: img.height });
      
      // Calculate frame dimensions
      // Backend creates horizontal sprite sheets where width = frameWidth * frameCount
      const calculatedFrameWidth = frameWidth || Math.floor(img.width / frameCount);
      const calculatedFrameHeight = frameHeight || img.height;
      
      // Extract individual frames
      const canvas = document.createElement('canvas');
      canvas.width = calculatedFrameWidth;
      canvas.height = calculatedFrameHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        const extractedFrames: string[] = [];
        for (let i = 0; i < frameCount; i++) {
          ctx.clearRect(0, 0, calculatedFrameWidth, calculatedFrameHeight);
          ctx.drawImage(
            img,
            i * calculatedFrameWidth, 0, // Source x, y
            calculatedFrameWidth, calculatedFrameHeight, // Source width, height
            0, 0, // Dest x, y
            calculatedFrameWidth, calculatedFrameHeight // Dest width, height
          );
          extractedFrames.push(canvas.toDataURL('image/png'));
        }
        setFrames(extractedFrames);
      }
    };
    img.onerror = () => setImgError(true);
    img.src = sheetUrl;
  }, [sheetUrl, frameCount, frameWidth, frameHeight]);

  // Handle frame navigation
  const nextFrame = () => {
    setIsPlaying(false);
    setCurrentFrame((prev) => (prev + 1) % frameCount);
  };

  const prevFrame = () => {
    setIsPlaying(false);
    setCurrentFrame((prev) => (prev - 1 + frameCount) % frameCount);
  };

  const handleFrameClick = (index: number) => {
    setIsPlaying(false);
    setViewMode('preview');
    setCurrentFrame(index);
  };

  const handleDownload = async () => {
    const urlToDownload = viewMode === 'sheet' ? sheetUrl : gifUrl;
    const ext = viewMode === 'sheet' ? 'png' : 'gif';
    
    try {
      const response = await fetch(urlToDownload);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sprite-${viewMode}-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(urlToDownload, '_blank');
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full p-2">
      
      {/* Top Toggle */}
      <div className="flex justify-center mb-2">
        <div className="bg-white border-2 border-black rounded-lg p-1 flex gap-1 shadow-retro">
          <button 
            onClick={() => setViewMode('preview')}
            className={`px-4 py-1 rounded text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'preview' ? 'bg-pastel-pink text-black shadow-sm border border-black' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Film size={14} /> ANIMATION
          </button>
          <button 
            onClick={() => { setViewMode('sheet'); setIsPlaying(false); }}
            className={`px-4 py-1 rounded text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'sheet' ? 'bg-pastel-mint text-black shadow-sm border border-black' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <ImageIcon size={14} /> SHEET
          </button>
        </div>
      </div>

      {/* Main Viewer */}
      <div className="relative flex-1 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-gray-200 border-2 border-black rounded-lg flex items-center justify-center overflow-hidden min-h-[300px] shadow-inner">
        
        {/* Pixel Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-10" style={{backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>

        {imgError ? (
          <div className="flex flex-col items-center gap-2 text-gray-500">
             <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center border-2 border-gray-400 border-dashed">
               <ImageIcon size={24} />
             </div>
             <span className="font-retro text-sm">IMAGE NOT FOUND</span>
          </div>
        ) : (
          <>
            {viewMode === 'sheet' && (
              <img 
                src={sheetUrl} 
                alt="Full Sprite Sheet" 
                className="max-w-[90%] max-h-[90%] object-contain drop-shadow-xl"
                style={{ imageRendering: 'pixelated' }}
                onError={() => setImgError(true)}
              />
            )}

            {viewMode === 'preview' && isPlaying && (
              <motion.img 
                src={gifUrl} 
                alt="Animation Preview" 
                className="max-w-[60%] max-h-[60%] object-contain drop-shadow-xl"
                style={{ imageRendering: 'pixelated' }}
                onError={() => setImgError(true)}
              />
            )}

            {viewMode === 'preview' && !isPlaying && frames[currentFrame] && (
              <img 
                src={frames[currentFrame]}
                alt={`Frame ${currentFrame + 1}`}
                className="max-w-[60%] max-h-[60%] object-contain drop-shadow-xl"
                style={{ imageRendering: 'pixelated' }}
              />
            )}
          </>
        )}
        
        <div className="absolute bottom-2 right-2 bg-black/80 text-white font-retro px-2 py-1 text-xs rounded border border-white/20">
          {viewMode === 'preview' ? (isPlaying ? 'GIF PLAYBACK' : `FRAME ${currentFrame + 1}/${frameCount}`) : 'FULL SHEET'}
        </div>
      </div>

      {/* Frame Timeline */}
      <div className="h-20 bg-gray-800 rounded-lg border-2 border-black overflow-x-auto overflow-y-hidden flex items-center px-2 shadow-inner">
        <div className="flex gap-2 h-16 items-center">
           {frames.length > 0 ? (
             frames.map((frameDataUrl, i) => (
               <button
                 key={i}
                 onClick={() => handleFrameClick(i)}
                 className={`
                   relative h-14 w-14 flex-shrink-0 bg-gray-700 rounded border-2 overflow-hidden transition-all
                   ${currentFrame === i && !isPlaying && viewMode === 'preview' 
                     ? 'border-pastel-yellow ring-2 ring-pastel-yellow/50 scale-105 z-10' 
                     : 'border-gray-600 opacity-70 hover:opacity-100 hover:border-gray-400'}
                 `}
               >
                 <img 
                   src={frameDataUrl} 
                   alt={`Frame ${i + 1}`}
                   className="w-full h-full object-contain"
                   style={{ imageRendering: 'pixelated' }}
                 />
                 <div className="absolute top-0 left-0 bg-black/60 text-[8px] text-white px-1 font-retro">
                   {i + 1}
                 </div>
               </button>
             ))
           ) : (
             // Placeholder while loading
             Array.from({ length: frameCount }).map((_, i) => (
               <div
                 key={i}
                 className="h-14 w-14 flex-shrink-0 bg-gray-700 rounded border-2 border-gray-600 animate-pulse"
               />
             ))
           )}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-retro-base border-2 border-black p-3 rounded-lg flex items-center justify-between flex-wrap gap-2 shadow-retro">
        <div className="flex items-center gap-2">
          {viewMode === 'preview' && (
            <>
              <button 
                onClick={() => setIsPlaying(!isPlaying)} 
                className={`p-2 border border-black shadow-sm active:shadow-none rounded-md transition-all ${isPlaying ? 'bg-pastel-yellow' : 'bg-white hover:bg-gray-50'}`}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              
              <div className="flex gap-1">
                <button onClick={prevFrame} className="p-2 hover:bg-black/10 rounded disabled:opacity-50" disabled={isPlaying}>
                  <ChevronLeft size={16}/>
                </button>
                <button onClick={nextFrame} className="p-2 hover:bg-black/10 rounded disabled:opacity-50" disabled={isPlaying}>
                  <ChevronRight size={16}/>
                </button>
              </div>

              <div className="h-6 w-[1px] bg-gray-400 mx-1"></div>
            </>
          )}
        </div>

        <div className="flex items-center gap-4 flex-1 justify-end">
          {viewMode === 'preview' && !isPlaying && (
            <div className="flex items-center gap-2 flex-1 max-w-[200px]">
              <span className="font-retro text-sm text-gray-600 whitespace-nowrap hidden sm:inline">SCRUB</span>
              <input 
                type="range" min="0" max={frameCount - 1} step="1"
                value={currentFrame} onChange={(e) => setCurrentFrame(Number(e.target.value))}
                className="w-full accent-pastel-yellow h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          )}
          
          <div className="h-6 w-[1px] bg-gray-400 hidden sm:block"></div>

          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-1.5 bg-pastel-yellow border-2 border-black rounded hover:brightness-105 active:translate-y-0.5 transition-all text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none"
          >
            <Download size={14} />
            <span className="hidden sm:inline font-retro text-black">{viewMode === 'preview' ? 'GIF' : 'PNG'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
