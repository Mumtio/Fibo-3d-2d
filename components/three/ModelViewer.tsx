import React, { Suspense, useState, useMemo, useLayoutEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Stage, useGLTF, Html, useProgress, Grid, Environment } from '@react-three/drei';
import { 
  RotateCw, Box, Sun, Grid3X3, MousePointer2, Loader2, RefreshCcw, 
  MoveHorizontal, MoveVertical, Palette, Image as ImageIcon, Layers,
  Scan
} from 'lucide-react';
import * as THREE from 'three';

// Fix for React Three Fiber JSX elements not being recognized
declare global {
  namespace JSX {
    interface IntrinsicElements {
      primitive: any;
      mesh: any;
      boxGeometry: any;
      meshStandardMaterial: any;
    }
  }
}

// --- Constants ---

const ENV_PRESETS = [
  'studio', 'city', 'sunset', 'dawn', 'night', 
  'warehouse', 'forest', 'park', 'lobby', 'apartment'
] as const;

const RENDER_MODES = [
  { id: 'original', label: 'Original', icon: Layers },
  { id: 'clay', label: 'Clay', icon: Box },
  { id: 'metal', label: 'Metal', icon: Palette },
  { id: 'normal', label: 'Normals', icon: Scan },
  { id: 'wireframe', label: 'Topology', icon: Grid3X3 },
] as const;

type RenderMode = typeof RENDER_MODES[number]['id'];

// --- Sub-components ---

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 bg-white p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <Loader2 className="animate-spin w-8 h-8 text-pastel-pink" />
        <span className="font-retro text-xl text-black">{progress.toFixed(0)}% LOADING...</span>
      </div>
    </Html>
  );
}

// Camera Reset Helper
function CameraController({ shouldReset, onResetComplete }: { shouldReset: boolean, onResetComplete: () => void }) {
  const { camera, controls } = useThree();
  const [initialState, setInitialState] = useState<{pos: THREE.Vector3, target: THREE.Vector3} | null>(null);

  useLayoutEffect(() => {
    if (!initialState) {
        setInitialState({
            pos: camera.position.clone(),
            target: new THREE.Vector3(0,0,0)
        });
    }
  }, [camera]);

  useLayoutEffect(() => {
    if (shouldReset && initialState) {
      camera.position.set(0, 0, 4);
      camera.lookAt(0,0,0);
      if (controls) {
        // @ts-ignore
        controls.reset(); 
      }
      onResetComplete();
    }
  }, [shouldReset, camera, controls, onResetComplete, initialState]);
  return null;
}

// Model Component with Advanced Material Switching
function Model({ url, mode }: { url: string; mode: RenderMode }) {
  const { scene } = useGLTF(url);

  // Define reuseable materials
  const materials = useMemo(() => ({
    clay: new THREE.MeshStandardMaterial({ color: '#e2e2e2', roughness: 0.8, metalness: 0.1 }),
    metal: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.1, metalness: 1.0 }),
    normal: new THREE.MeshNormalMaterial(),
    wireframe: new THREE.MeshBasicMaterial({ color: '#00ff41', wireframe: true }),
  }), []);

  // Clone scene for display to avoid mutating cached original
  const displayScene = useMemo(() => scene.clone(), [scene]);

  useLayoutEffect(() => {
    displayScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        
        // Store original material if not stored yet
        if (!mesh.userData.originalMaterial) {
          mesh.userData.originalMaterial = mesh.material;
        }

        switch (mode) {
          case 'original':
            mesh.material = mesh.userData.originalMaterial;
            break;
          case 'clay':
            mesh.material = materials.clay;
            break;
          case 'metal':
            mesh.material = materials.metal;
            break;
          case 'normal':
            mesh.material = materials.normal;
            break;
          case 'wireframe':
            mesh.material = materials.wireframe;
            break;
        }
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [displayScene, mode, materials]);

  return <primitive object={displayScene} />;
}

// Preload sample
useGLTF.preload('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb');

interface ModelViewerProps {
  url?: string | null;
}

export const ModelViewer: React.FC<ModelViewerProps> = ({ url }) => {
  // State
  const [autoRotate, setAutoRotate] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  
  // Lighting & Environment
  const [lightIntensity, setLightIntensity] = useState(1);
  const [lightRotation, setLightRotation] = useState(0); // Azimuth
  const [lightElevation, setLightElevation] = useState(0); // Polar
  const [envIndex, setEnvIndex] = useState(0);
  
  // Material Mode
  const [renderMode, setRenderMode] = useState<RenderMode>('original');

  const [resetCamera, setResetCamera] = useState(false);

  // Actions
  const toggleRotate = () => setAutoRotate(!autoRotate);
  const toggleGrid = () => setShowGrid(!showGrid);
  const handleReset = () => {
    setResetCamera(true);
    setLightRotation(0);
    setLightElevation(0);
    setLightIntensity(1);
  };
  
  const cycleEnv = () => setEnvIndex((prev) => (prev + 1) % ENV_PRESETS.length);
  
  const cycleRenderMode = () => {
    const currentIndex = RENDER_MODES.findIndex(m => m.id === renderMode);
    const nextIndex = (currentIndex + 1) % RENDER_MODES.length;
    setRenderMode(RENDER_MODES[nextIndex].id);
  };

  const currentEnv = ENV_PRESETS[envIndex];
  const currentModeInfo = RENDER_MODES.find(m => m.id === renderMode) || RENDER_MODES[0];

  return (
    <div className="w-full h-full relative bg-gray-100 overflow-hidden group">
      
      {/* 3D Canvas Container */}
      <div className="absolute inset-0">
        <Canvas shadows dpr={[1, 2]} camera={{ fov: 45, position: [0, 0, 4] }}>
          <Suspense fallback={<Loader />}>
            <Stage 
              environment={null as any} 
              intensity={0.5} 
              contactShadow={true}
              adjustCamera={false} 
            >
              {url ? (
                <Model url={url} mode={renderMode} />
              ) : (
                <mesh>
                  <boxGeometry args={[1, 1, 1]} />
                  <meshStandardMaterial color="#FF90E8" />
                </mesh>
              )}
            </Stage>
            
            {/* Dynamic Environment */}
            <Environment 
              preset={currentEnv} 
              background={false} 
              environmentRotation={[lightElevation, lightRotation, 0]} 
              environmentIntensity={lightIntensity}
            />

            {showGrid && (
              <Grid 
                renderOrder={-1} 
                position={[0, -0.01, 0]} 
                infiniteGrid 
                cellSize={0.5} 
                sectionSize={3} 
                fadeDistance={30} 
                sectionColor="#404040" 
                cellColor="#b0b0b0" 
              />
            )}
            
            <CameraController shouldReset={resetCamera} onResetComplete={() => setResetCamera(false)} />
          </Suspense>
          
          <OrbitControls 
            makeDefault 
            autoRotate={autoRotate} 
            autoRotateSpeed={1.5} 
            enablePan={true}
            enableZoom={true}
            minDistance={2}
            maxDistance={10}
          />
        </Canvas>
      </div>

      {/* Floating Toolbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-[95%] z-20">
        <div className="flex gap-2 items-center bg-white/95 backdrop-blur-md p-2 rounded-2xl border-2 border-black shadow-[0px_8px_0px_0px_rgba(0,0,0,0.15)] overflow-x-auto pb-3 pt-2 px-4 no-scrollbar">
          
          {/* Basics */}
          <div className="flex gap-1 pr-2 border-r border-gray-200">
            <button 
              onClick={toggleRotate}
              title="Auto-Rotate"
              className={`p-2 rounded-xl transition-all ${autoRotate ? 'bg-pastel-mint text-black shadow-inner border border-black/10' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              <RotateCw size={18} className={autoRotate ? 'animate-spin-slow' : ''} />
            </button>
            <button 
              onClick={toggleGrid}
              title="Grid"
              className={`p-2 rounded-xl transition-all ${showGrid ? 'bg-pastel-yellow text-black shadow-inner border border-black/10' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              <Grid3X3 size={18} />
            </button>
            <button onClick={handleReset} title="Reset View" className="p-2 hover:bg-gray-100 rounded-xl text-gray-500">
              <RefreshCcw size={18} />
            </button>
          </div>

          {/* Render Mode */}
          <div className="flex items-center gap-2 px-2 border-r border-gray-200 min-w-max">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden sm:block">Texture</span>
            <button 
              onClick={cycleRenderMode}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors min-w-[110px] justify-between group/mode"
              title="Cycle Render Mode"
            >
              <div className="flex items-center gap-2">
                <currentModeInfo.icon size={14} className="text-gray-700" />
                <span className="text-xs font-bold text-gray-800">{currentModeInfo.label}</span>
              </div>
            </button>
          </div>

          {/* Environment */}
          <div className="flex items-center gap-2 px-2 border-r border-gray-200 min-w-max">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden sm:block">Env</span>
            <button 
              onClick={cycleEnv}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors min-w-[100px] justify-between"
              title="Change Lighting Environment"
            >
              <div className="flex items-center gap-2">
                <ImageIcon size={14} className="text-gray-700" />
                <span className="text-xs font-bold text-gray-800 capitalize">{currentEnv}</span>
              </div>
            </button>
          </div>

          {/* Light Controls */}
          <div className="flex items-center gap-4 px-2 min-w-max">
            {/* Intensity */}
            <div className="flex flex-col items-center gap-1">
              <Sun size={10} className="text-gray-400" />
              <input 
                type="range" min="0.2" max="3" step="0.1" 
                value={lightIntensity}
                onChange={(e) => setLightIntensity(parseFloat(e.target.value))}
                className="w-16 h-1 rounded-full appearance-none bg-gray-200 accent-black cursor-pointer"
              />
            </div>
            {/* Horizontal */}
            <div className="flex flex-col items-center gap-1">
              <MoveHorizontal size={10} className="text-gray-400" />
              <input 
                type="range" min="0" max={Math.PI * 2} step="0.1" 
                value={lightRotation}
                onChange={(e) => setLightRotation(parseFloat(e.target.value))}
                className="w-16 h-1 rounded-full appearance-none bg-gray-200 accent-black cursor-pointer"
              />
            </div>
            {/* Vertical */}
            <div className="flex flex-col items-center gap-1">
              <MoveVertical size={10} className="text-gray-400" />
              <input 
                type="range" min={0} max={Math.PI} step="0.1" 
                value={lightElevation}
                onChange={(e) => setLightElevation(parseFloat(e.target.value))}
                className="w-16 h-1 rounded-full appearance-none bg-gray-200 accent-black cursor-pointer"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Mode Indicator Overlay */}
      <div className="absolute top-4 right-4 z-10 pointer-events-none">
        <div className="flex flex-col items-end gap-1">
          <div className="bg-black text-white text-[10px] px-2 py-1 font-retro rounded shadow-md flex items-center gap-2 uppercase">
            <span>MODE: {currentModeInfo.label}</span>
          </div>
          <div className="bg-white/80 backdrop-blur text-black text-[10px] px-2 py-1 font-retro rounded shadow-sm border border-black/10 uppercase">
             ENV: {currentEnv}
          </div>
        </div>
      </div>

      {/* Top Left Indicator */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="bg-pastel-pink border border-black text-black text-xs px-2 py-1 font-retro rounded shadow-float flex items-center gap-2">
          <MousePointer2 size={12} />
          <span>INTERACTIVE</span>
        </div>
      </div>
    </div>
  );
};