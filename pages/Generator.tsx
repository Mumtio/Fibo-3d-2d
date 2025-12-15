import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { RetroCard } from '../components/ui/RetroCard';
import { BevelButton } from '../components/ui/BevelButton';
import { ModelViewer } from '../components/three/ModelViewer';
import { SpriteAnimator } from '../components/sprite/SpriteAnimator';
import { 
  Wand2, RefreshCw, Layers, Sparkles, AlertCircle, CheckCircle, 
  Download, Info, ChevronDown, ChevronUp 
} from 'lucide-react';
import { api, SpritePreset, SpriteGenerationResult } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

export const Generator: React.FC = () => {
  const { 
    selectedMode, setMode, prompt, setPrompt, 
    steps, updateStep, resetSteps, isGenerating, 
    generationStatus, currentResult, setCurrentResult 
  } = useAppStore();

  // Backend state
  const [spriteBackendStatus, setSpriteBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [backend3DStatus, setBackend3DStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [presets, setPresets] = useState<Record<string, SpritePreset>>({});
  
  // Generation config
  const [selectedPreset, setSelectedPreset] = useState('anime_action');
  const [selectedAnimations, setSelectedAnimations] = useState<string[]>([]);
  
  // Results
  const [spriteResult, setSpriteResult] = useState<SpriteGenerationResult | null>(null);
  const [selectedAnimation, setSelectedAnimation] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>('');

  // Check backends on mount
  useEffect(() => {
    const checkBackends = async () => {
      // Check sprite backend
      const spriteHealthy = await api.checkSpriteHealth();
      setSpriteBackendStatus(spriteHealthy ? 'online' : 'offline');
      
      if (spriteHealthy) {
        try {
          const loadedPresets = await api.getSpritePresets();
          setPresets(loadedPresets);
        } catch (e) {
          console.error('Failed to load presets:', e);
        }
      }

      // Check 3D backend
      const backend3DHealthy = await api.check3DHealth();
      setBackend3DStatus(backend3DHealthy ? 'online' : 'offline');
    };
    checkBackends();
    const interval = setInterval(checkBackends, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get current preset info
  const currentPreset = presets[selectedPreset];
  const availableAnimations = currentPreset?.animations 
    ? Object.keys(currentPreset.animations) 
    : [];

  // Reset animation selection when preset changes
  useEffect(() => {
    setSelectedAnimations([]);
  }, [selectedPreset]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setErrorMessage('Please enter a prompt');
      return;
    }
    
    setErrorMessage(null);
    setSpriteResult(null);
    resetSteps();
    useAppStore.setState({ isGenerating: true, generationStatus: 'generating' });

    try {
      if (selectedMode === '3D') {
        // 3D Generation using FIBO -> TRIPO pipeline
        updateStep('structured', 'active');
        setProgressMessage('Starting pipeline...');
        updateStep('structured', 'completed');

        updateStep('canonical', 'active');
        updateStep('mesh', 'active');
        
        // Use the full pipeline which handles everything
        const result = await api.generate3D(prompt, (status) => {
          setProgressMessage(status);
          // Update steps based on status
          if (status.includes('FIBO') || status.includes('image')) {
            updateStep('canonical', 'active');
          } else if (status.includes('TRIPO') || status.includes('3D')) {
            updateStep('canonical', 'completed');
            updateStep('mesh', 'active');
          }
        });
        
        updateStep('canonical', 'completed');
        updateStep('mesh', 'completed');
        updateStep('cleanup', 'completed');
        updateStep('final', 'completed');
        
        setCurrentResult({
          id: Date.now().toString(),
          type: '3D',
          prompt,
          thumbnailUrl: result.imageUrl,
          fileUrl: result.modelUrl,
          createdAt: new Date().toISOString()
        });
        setProgressMessage('');
      } else {
        // 2D Sprite Generation
        updateStep('concept', 'active');
        await new Promise(r => setTimeout(r, 300));
        updateStep('concept', 'completed');

        updateStep('spritesheet', 'active');
        
        const result = await api.generateSprite(
          prompt,
          selectedPreset,
          selectedAnimations.length > 0 ? selectedAnimations : undefined
        );
        
        updateStep('spritesheet', 'completed');
        updateStep('animation', 'completed');
        
        setSpriteResult(result);
        
        // Set first animation as selected
        const firstAnim = Object.keys(result.animations)[0];
        setSelectedAnimation(firstAnim);

        setCurrentResult({
          id: result.job_id,
          type: 'SPRITE',
          prompt,
          thumbnailUrl: api.getOutputUrl(result.download_urls.combined_sheet),
          fileUrl: api.getOutputUrl(result.download_urls[`${firstAnim}_gif`]),
          createdAt: new Date().toISOString()
        });
      }

      useAppStore.setState({ isGenerating: false, generationStatus: 'completed' });
    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : 'Generation failed');
      useAppStore.setState({ isGenerating: false, generationStatus: 'failed' });
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 max-w-7xl mx-auto min-h-[calc(100vh-10rem)]">
      
      {/* LEFT COLUMN: CONTROLS */}
      <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto">
        
        {/* Mode Switcher */}
        <RetroCard variant="mac" title="Configuration">
          <div className="flex gap-2 bg-gray-200 p-1 rounded-lg mb-4">
            <button 
              onClick={() => setMode('3D')}
              className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
                selectedMode === '3D' ? 'bg-white shadow-sm text-black' : 'text-gray-500'
              }`}
            >
              3D MODEL
            </button>
            <button 
              onClick={() => setMode('SPRITE')}
              className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
                selectedMode === 'SPRITE' ? 'bg-white shadow-sm text-black' : 'text-gray-500'
              }`}
            >
              2D SPRITE
            </button>
          </div>

          <div className="space-y-4">
            {/* Backend Status */}
            {selectedMode === 'SPRITE' && (
              <div className={`flex items-center gap-2 p-2 rounded-lg text-xs font-bold ${
                spriteBackendStatus === 'online' ? 'bg-green-50 text-green-700' :
                spriteBackendStatus === 'offline' ? 'bg-red-50 text-red-700' :
                'bg-yellow-50 text-yellow-700'
              }`}>
                {spriteBackendStatus === 'online' ? <CheckCircle size={14} /> : 
                 spriteBackendStatus === 'offline' ? <AlertCircle size={14} /> :
                 <RefreshCw size={14} className="animate-spin" />}
                <span>
                  {spriteBackendStatus === 'online' ? '2D Backend Connected (localhost:5000)' :
                   spriteBackendStatus === 'offline' ? '2D Backend Offline - Run: python app.py in backend 2d sprite folder' :
                   'Checking 2D backend...'}
                </span>
              </div>
            )}
            {selectedMode === '3D' && (
              <div className={`flex items-center gap-2 p-2 rounded-lg text-xs font-bold ${
                backend3DStatus === 'online' ? 'bg-green-50 text-green-700' :
                backend3DStatus === 'offline' ? 'bg-red-50 text-red-700' :
                'bg-yellow-50 text-yellow-700'
              }`}>
                {backend3DStatus === 'online' ? <CheckCircle size={14} /> : 
                 backend3DStatus === 'offline' ? <AlertCircle size={14} /> :
                 <RefreshCw size={14} className="animate-spin" />}
                <span>
                  {backend3DStatus === 'online' ? '3D Backend Connected (localhost:8000)' :
                   backend3DStatus === 'offline' ? '3D Backend Offline - Run: uvicorn app.main:app in 3d backend folder' :
                   'Checking 3D backend...'}
                </span>
              </div>
            )}

            {/* Prompt Input */}
            <div>
              <label className="block text-xs font-bold uppercase mb-1 text-gray-600">
                Character Description
              </label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={selectedMode === '3D' 
                  ? "A cyberpunk robot with neon wings..." 
                  : "ninja warrior with katana, red outfit..."
                }
                className="w-full p-3 bg-white border-2 border-gray-300 rounded-lg focus:border-pastel-pink focus:outline-none min-h-[80px] font-medium resize-none"
              />
            </div>

            {/* Sprite-specific options */}
            {selectedMode === 'SPRITE' && (
              <>
                {/* Style Preset */}
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 text-gray-600">
                    Style Preset
                  </label>
                  <select 
                    value={selectedPreset}
                    onChange={(e) => setSelectedPreset(e.target.value)}
                    className="w-full p-2 border-2 border-gray-300 rounded-lg bg-white text-sm font-medium"
                  >
                    {Object.entries(presets).map(([key, preset]) => (
                      <option key={key} value={key}>
                        {preset.display_name}
                      </option>
                    ))}
                  </select>
                  {currentPreset && (
                    <p className="text-xs text-gray-500 mt-1">
                      {currentPreset.description} • {currentPreset.canvas[0]}x{currentPreset.canvas[1]}px
                    </p>
                  )}
                </div>

                {/* Animation Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 text-gray-600">
                    Animations
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableAnimations.map(anim => (
                      <button
                        key={anim}
                        onClick={() => {
                          setSelectedAnimations(prev => 
                            prev.includes(anim) 
                              ? prev.filter(a => a !== anim)
                              : [...prev, anim]
                          );
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border-2 transition-all ${
                          selectedAnimations.includes(anim)
                            ? 'bg-pastel-pink border-black text-black'
                            : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        {anim}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {selectedAnimations.length === 0 
                      ? 'All animations will be generated' 
                      : `${selectedAnimations.length} selected`}
                  </p>
                </div>

                {/* Advanced Options Toggle */}
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  Advanced Options
                </button>

                {showAdvanced && currentPreset && (
                  <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Style:</span>
                      <span className="font-medium">{currentPreset.style}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Frame Rate:</span>
                      <span className="font-medium">{currentPreset.frame_rate} FPS</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Frame Duration:</span>
                      <span className="font-medium">{currentPreset.frame_duration}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Color Scheme:</span>
                      <span className="font-medium text-right max-w-[150px]">{currentPreset.color_scheme}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                {errorMessage}
              </div>
            )}

            {/* Generate Button */}
            <BevelButton 
              label={isGenerating ? 'Generating...' : 'Generate'} 
              variant="primary" 
              className="w-full h-12 text-lg" 
              icon={isGenerating ? <RefreshCw className="animate-spin" size={20} /> : <Wand2 size={20} />}
              onClick={handleGenerate}
              disabled={isGenerating || 
                (selectedMode === 'SPRITE' && spriteBackendStatus !== 'online') ||
                (selectedMode === '3D' && backend3DStatus !== 'online')}
            />
          </div>
        </RetroCard>

        {/* Progress Panel */}
        <AnimatePresence>
          {(isGenerating || generationStatus === 'completed') && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <RetroCard variant="mac" title="Progress">
                <div className="space-y-2">
                  {steps.map((step) => (
                    <div key={step.id} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs ${
                        step.status === 'completed' ? 'bg-pastel-mint border-green-600 text-green-700' : 
                        step.status === 'active' ? 'bg-pastel-yellow border-yellow-600' : 
                        'bg-gray-100 border-gray-300'
                      }`}>
                        {step.status === 'completed' && '✓'}
                        {step.status === 'active' && <RefreshCw size={10} className="animate-spin" />}
                      </div>
                      <span className={`text-sm ${step.status === 'pending' ? 'text-gray-400' : 'text-gray-700'}`}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </RetroCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT COLUMN: VIEWER */}
      <div className="lg:col-span-8">
        <RetroCard variant="soft" className="h-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Layers className="text-pastel-purple" />
              Result Viewer
            </h2>
            {spriteResult && (
              <div className="text-xs text-gray-400">
                Job: {spriteResult.job_id.slice(0, 8)}...
              </div>
            )}
          </div>
          
          {/* Viewer Container */}
          <div className="bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 overflow-hidden relative min-h-[400px]">
            {!currentResult && !isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-4">
                <Sparkles size={48} className="text-gray-300" />
                <span className="font-bold">Enter a prompt and click Generate</span>
              </div>
            )}
            
            {isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-20">
                <RefreshCw className="animate-spin text-pastel-pink w-12 h-12 mb-4" />
                <span className="font-bold tracking-wide">
                  {selectedMode === '3D' ? 'Generating 3D model...' : 'Generating sprites...'}
                </span>
                {progressMessage && (
                  <span className="text-sm text-gray-500 mt-2">{progressMessage}</span>
                )}
              </div>
            )}

            {currentResult && selectedMode === '3D' && (
              <ModelViewer key={currentResult.id} url={currentResult.fileUrl} />
            )}

            {currentResult && selectedMode === 'SPRITE' && spriteResult && (
              <div className="p-4 h-full">
                {/* Animation Tabs */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.keys(spriteResult.animations).map(anim => (
                    <button
                      key={anim}
                      onClick={() => {
                        setSelectedAnimation(anim);
                        setCurrentResult({
                          ...currentResult,
                          fileUrl: api.getOutputUrl(spriteResult.download_urls[`${anim}_gif`])
                        });
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        selectedAnimation === anim
                          ? 'bg-pastel-pink text-black'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {anim}
                    </button>
                  ))}
                </div>

                {/* Sprite Display */}
                <div className="flex justify-center items-center bg-white rounded-lg p-4 min-h-[300px]">
                  <SpriteAnimator 
                    key={selectedAnimation}
                    gifUrl={currentResult.fileUrl} 
                    sheetUrl={api.getOutputUrl(spriteResult.download_urls[`${selectedAnimation}_sheet`])}
                    frameCount={spriteResult.animations[selectedAnimation]?.frame_count || 6}
                    frameWidth={spriteResult.frame_size[0]}
                    frameHeight={spriteResult.frame_size[1]}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Download Section */}
          {spriteResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Download size={16} />
                Downloads
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleDownload(
                    api.getOutputUrl(spriteResult.download_urls.combined_sheet),
                    `${spriteResult.job_id}_combined.png`
                  )}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 flex items-center gap-1"
                >
                  <Download size={12} /> Combined Sheet
                </button>
                <button
                  onClick={() => handleDownload(
                    api.getOutputUrl(spriteResult.download_urls.metadata),
                    `${spriteResult.job_id}_metadata.json`
                  )}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 flex items-center gap-1"
                >
                  <Info size={12} /> Metadata (JSON)
                </button>
                {Object.keys(spriteResult.animations).map(anim => (
                  <button
                    key={anim}
                    onClick={() => handleDownload(
                      api.getOutputUrl(spriteResult.download_urls[`${anim}_gif`]),
                      `${spriteResult.job_id}_${anim}.gif`
                    )}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 flex items-center gap-1"
                  >
                    <Download size={12} /> {anim}.gif
                  </button>
                ))}
              </div>
            </div>
          )}
        </RetroCard>
      </div>
    </div>
  );
};
