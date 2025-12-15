import { create } from 'zustand';
import { GenType, GenerationStatus, GenerationStep, Asset } from '../types';

interface AppState {
  // Navigation
  currentTab: 'home' | 'generate' | 'library';
  setTab: (tab: 'home' | 'generate' | 'library') => void;

  // Generation State
  selectedMode: GenType;
  setMode: (mode: GenType) => void;
  
  prompt: string;
  setPrompt: (text: string) => void;

  isGenerating: boolean;
  generationStatus: GenerationStatus;
  
  steps: GenerationStep[];
  updateStep: (id: string, status: 'pending' | 'active' | 'completed') => void;
  resetSteps: () => void;

  currentResult: Asset | null;
  setCurrentResult: (asset: Asset | null) => void;

  // Library
  assets: Asset[];
  addAsset: (asset: Asset) => void;
}

const INITIAL_STEPS_3D: GenerationStep[] = [
  { id: 'structured', label: 'Structure Prompt', status: 'pending', description: 'Analyzing intent...' },
  { id: 'canonical', label: 'Canonical View', status: 'pending', description: 'Generating 2D reference...' },
  { id: 'mesh', label: 'Mesh Gen', status: 'pending', description: 'Triangulating geometry...' },
  { id: 'cleanup', label: 'Blender Cleanup', status: 'pending', description: 'Optimizing topology...' },
  { id: 'final', label: 'Finalizing', status: 'pending', description: 'Baking textures...' },
];

const INITIAL_STEPS_SPRITE: GenerationStep[] = [
  { id: 'concept', label: 'Concept Art', status: 'pending' },
  { id: 'spritesheet', label: 'Sheet Generation', status: 'pending' },
  { id: 'animation', label: 'Animation Test', status: 'pending' },
];

export const useAppStore = create<AppState>((set) => ({
  currentTab: 'home',
  setTab: (tab) => set({ currentTab: tab }),

  selectedMode: '3D',
  setMode: (mode) => set({ 
    selectedMode: mode, 
    steps: mode === '3D' ? INITIAL_STEPS_3D : INITIAL_STEPS_SPRITE 
  }),

  prompt: '',
  setPrompt: (text) => set({ prompt: text }),

  isGenerating: false,
  generationStatus: 'idle',
  
  steps: INITIAL_STEPS_3D,
  updateStep: (id, status) => set((state) => ({
    steps: state.steps.map(s => s.id === id ? { ...s, status } : s)
  })),
  resetSteps: () => set((state) => ({
    steps: state.selectedMode === '3D' ? INITIAL_STEPS_3D : INITIAL_STEPS_SPRITE,
    generationStatus: 'idle',
    isGenerating: false
  })),

  currentResult: null,
  setCurrentResult: (asset) => set({ currentResult: asset }),

  assets: [],
  addAsset: (asset) => set((state) => ({ assets: [asset, ...state.assets] }))
}));