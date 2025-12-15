import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { RetroCard } from '../components/ui/RetroCard';
import { BevelButton } from '../components/ui/BevelButton';
import { ModelViewer } from '../components/three/ModelViewer';
import { SpriteAnimator } from '../components/sprite/SpriteAnimator';
import { 
  Wand2, RefreshCw, Layers, Sparkles, AlertCircle, CheckCircle, 
  Download, Info, ChevronDown, ChevronUp, Gauge, Play, Pause,
  Box, Ghost, Zap, AlertTriangle
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
  const [errorType, setErrorType] = useState<'moderation' | 'network' | 'general'>('general');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [animationSpeed, setAnimationSpeed] = useState<number>(100); // ms per frame
  const [isPlaying, setIsPlaying] = useState(true);
  const [useFiboEnhanced, setUseFiboEnhanced] = useState(false);

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
        setProgressMessage(useFiboEnhanced ? 'Using FIBO Enhanced mode...' : 'Preparing generation...');
        await new Promise(r => setTimeout(r, 300));
        updateStep('concept', 'completed');

        updateStep('spritesheet', 'active');
        setProgressMessage('Generating sprite sheets...');
        
        const result = await api.generateSprite(
          prompt,
          selectedPreset,
          selectedAnimations.length > 0 ? selectedAnimations : undefined,
          useFiboEnhanced
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
      const errorMsg = e instanceof Error ? e.message : 'Generation failed';
      
      // Detect error type for better formatting
      if (errorMsg.toLowerCase().includes('moderation') || errorMsg.toLowerCase().includes('content')) {
        setErrorType('moderation');
        setErrorMessage('Your prompt was flagged by content moderation. Please try a different description without potentially offensive or inappropriate content.');
      } else if (errorMsg.toLowerCase().includes('network') || errorMsg.toLowerCase().includes('fetch') || errorMsg.toLowerCase().includes('timeout')) {
        setErrorType('network');
        setErrorMessage('Network error. Please check your connection and ensure the backend server is running.');
      } else {
        setErrorType('general');
        setErrorMessage(errorMsg);
      }
      
      setProgressMessage('');
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
                  {spriteBackendStatus === 'online' ? '2D Backend Connected' :
                   spriteBackendStatus === 'offline' ? '2D Backend Offline' :
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
                  {backend3DStatus === 'online' ? '3D Backend Connected' :
                   backend3DStatus === 'offline' ? '3D Backend Offline' :
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
                  <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-3">
                    {/* FIBO Enhanced Mode Toggle */}
                    <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Zap size={14} className={useFiboEnhanced ? 'text-pastel-pink' : 'text-gray-400'} />
                          <span className="font-bold text-gray-700">FIBO Enhanced</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          Uses structured prompts for more accurate sprite sheets
                        </p>
                      </div>
                      <button
                        onClick={() => setUseFiboEnhanced(!useFiboEnhanced)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          useFiboEnhanced ? 'bg-pastel-pink' : 'bg-gray-300'
                        }`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          useFiboEnhanced ? 'translate-x-7' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    
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
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg text-sm ${
                  errorType === 'moderation' 
                    ? 'bg-orange-50 border-2 border-orange-300' 
                    : errorType === 'network'
                    ? 'bg-yellow-50 border-2 border-yellow-300'
                    : 'bg-red-50 border-2 border-red-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${
                    errorType === 'moderation' ? 'bg-orange-100' :
                    errorType === 'network' ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    {errorType === 'moderation' ? (
                      <AlertTriangle size={18} className="text-orange-600" />
                    ) : errorType === 'network' ? (
                      <Zap size={18} className="text-yellow-600" />
                    ) : (
                      <AlertCircle size={18} className="text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-bold mb-1 ${
                      errorType === 'moderation' ? 'text-orange-800' :
                      errorType === 'network' ? 'text-yellow-800' : 'text-red-800'
                    }`}>
                      {errorType === 'moderation' ? 'Content Moderation' :
                       errorType === 'network' ? 'Connection Issue' : 'Generation Failed'}
                    </h4>
                    <p className={`${
                      errorType === 'moderation' ? 'text-orange-700' :
                      errorType === 'network' ? 'text-yellow-700' : 'text-red-700'
                    }`}>
                      {errorMessage}
                    </p>
                    {errorType === 'moderation' && (
                      <p className="text-orange-600 text-xs mt-2 italic">
                        Tip: Try using more neutral, descriptive terms for your character.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
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
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-white/95 to-gray-50/95 z-20"
              >
                {/* Animated Icon */}
                <div className="relative mb-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-20 h-20 rounded-full border-4 border-gray-200 border-t-pastel-pink"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {selectedMode === '3D' ? (
                      <Box size={32} className="text-pastel-pink" />
                    ) : (
                      <Ghost size={32} className="text-pastel-mint" />
                    )}
                  </div>
                </div>
                
                {/* Title */}
                <motion.h3 
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-xl font-bold tracking-wide text-gray-800 mb-2"
                >
                  {selectedMode === '3D' ? 'Creating 3D Model' : 'Generating Sprites'}
                </motion.h3>
                
                {/* Progress Message */}
                {progressMessage && (
                  <motion.div
                    key={progressMessage}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm border"
                  >
                    <Sparkles size={14} className="text-pastel-yellow" />
                    <span className="text-sm">{progressMessage}</span>
                  </motion.div>
                )}
                
                {/* Animated Dots */}
                <div className="flex gap-1 mt-4">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      className={`w-2 h-2 rounded-full ${selectedMode === '3D' ? 'bg-pastel-pink' : 'bg-pastel-mint'}`}
                    />
                  ))}
                </div>
              </motion.div>
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
                    speed={animationSpeed}
                    onSpeedChange={setAnimationSpeed}
                    externalIsPlaying={isPlaying}
                    onPlayingChange={setIsPlaying}
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
