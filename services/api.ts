import { Asset } from '../types';

/**
 * Backend Integration - 2D Sprites & 3D Models
 */

const SPRITE_API_BASE = import.meta.env.VITE_SPRITE_API_URL || 'http://localhost:5000';
const MODEL_3D_API_BASE = import.meta.env.VITE_3D_API_URL || 'http://localhost:8000';

// --- TYPES ---
export interface SpritePreset {
  name: string;
  display_name: string;
  description: string;
  style: string;
  medium: string;
  canvas: [number, number];
  color_scheme: string;
  frame_rate: number;
  frame_duration: number;
  animations: Record<string, number>;
  prompt_augmentation?: {
    prefix: string;
    suffix: string;
  };
}

export interface AnimationOutput {
  sprite_sheet: string;
  gif: string;
  frame_count: number;
}

export interface SpriteGenerationResult {
  job_id: string;
  status: string;
  prompt: string;
  preset: string;
  frame_size: [number, number];
  combined_sheet: string;
  animations: Record<string, AnimationOutput>;
  metadata: string;
  download_urls: Record<string, string>;
}

export interface SpriteRefineResult {
  job_id: string;
  original_job_id: string;
  status: string;
  animation: string;
  prompt: string;
  refinement: string;
  frame_size: [number, number];
  frame_count: number;
  sprite_sheet: string;
  gif: string;
  download_urls: Record<string, string>;
}

// --- 3D TYPES ---
export interface FiboStructure {
  category: string;
  description: string;
  style: string;
}

export interface Generation3DResult {
  job_id: string;
  message: string;
  image_url?: string;
  model_url?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
}

// --- MOCK HELPERS (for 3D mode) ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- API METHODS ---
export const api = {
  
  // ==================== SPRITE BACKEND ====================
  
  /**
   * Check if sprite backend is available
   */
  checkSpriteHealth: async (): Promise<boolean> => {
    try {
      const response = await fetch(`${SPRITE_API_BASE}/api/sprite/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * GET /api/sprite/presets - Fetch all available presets
   */
  getSpritePresets: async (): Promise<Record<string, SpritePreset>> => {
    const response = await fetch(`${SPRITE_API_BASE}/api/sprite/presets`);
    if (!response.ok) {
      throw new Error(`Failed to fetch presets: ${response.status}`);
    }
    return response.json();
  },

  /**
   * GET /api/sprite/presets/:name - Fetch a specific preset
   */
  getSpritePreset: async (presetName: string): Promise<SpritePreset> => {
    const response = await fetch(`${SPRITE_API_BASE}/api/sprite/presets/${presetName}`);
    if (!response.ok) {
      throw new Error(`Preset not found: ${presetName}`);
    }
    return response.json();
  },

  /**
   * POST /api/sprite/generate - Generate sprite sheets
   */
  generateSprite: async (
    prompt: string,
    preset: string,
    animations?: string[],
    useFiboEnhanced?: boolean
  ): Promise<SpriteGenerationResult> => {
    const response = await fetch(`${SPRITE_API_BASE}/api/sprite/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        preset,
        animations: animations?.length ? animations : undefined,
        use_fibo_enhanced: useFiboEnhanced || false
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `API error: ${response.status}`);
    }

    return response.json();
  },

  /**
   * Build full URL for sprite output files
   */
  getOutputUrl: (path: string): string => {
    if (path.startsWith('http')) return path;
    return `${SPRITE_API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  },

  /**
   * POST /api/sprite/refine - Refine a specific animation with feedback
   */
  refineSprite: async (
    jobId: string,
    animation: string,
    prompt: string,
    refinement: string,
    preset?: string
  ): Promise<SpriteRefineResult> => {
    const response = await fetch(`${SPRITE_API_BASE}/api/sprite/refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId,
        animation,
        prompt,
        refinement,
        preset: preset || 'anime_action'
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Refine failed: ${response.status}`);
    }

    return response.json();
  },

  // ==================== 3D BACKEND ====================

  /**
   * Check if 3D backend is available
   */
  check3DHealth: async (): Promise<boolean> => {
    try {
      const response = await fetch(`${MODEL_3D_API_BASE}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * POST /fibo/structured - Get structured prompt from user text
   */
  structurePrompt: async (prompt: string): Promise<FiboStructure> => {
    const response = await fetch(`${MODEL_3D_API_BASE}/fibo/structured`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_text: prompt })
    });

    if (!response.ok) {
      throw new Error(`Failed to structure prompt: ${response.status}`);
    }

    return response.json();
  },

  /**
   * POST /fibo/render - Generate canonical image from structured prompt
   */
  generateCanonical: async (structure: FiboStructure): Promise<string> => {
    const response = await fetch(`${MODEL_3D_API_BASE}/fibo/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ structure })
    });

    if (!response.ok) {
      throw new Error(`Failed to render image: ${response.status}`);
    }

    const result = await response.json();
    return result.image_url;
  },

  /**
   * POST /3d/generate-full-pipeline - Start full 3D generation pipeline (async)
   * Returns job_id for tracking
   */
  start3DPipeline: async (prompt: string): Promise<{ job_id: string; message: string }> => {
    const response = await fetch(`${MODEL_3D_API_BASE}/3d/generate-full-pipeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error(`Failed to start 3D pipeline: ${response.status}`);
    }

    return response.json();
  },

  /**
   * GET /3d/status/{job_id} - Get job status
   */
  get3DJobStatus: async (jobId: string): Promise<{
    job_id: string;
    status: string;
    image_url?: string;
    model_url?: string;
    error?: string;
  }> => {
    const response = await fetch(`${MODEL_3D_API_BASE}/3d/status/${jobId}`);
    if (!response.ok) {
      throw new Error(`Failed to get job status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * POST /3d/generate-sync - Synchronous 3D generation (waits for completion)
   */
  generate3DSync: async (prompt: string): Promise<{
    status: string;
    image_url: string;
    model_url: string;
  }> => {
    const response = await fetch(`${MODEL_3D_API_BASE}/3d/generate-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `Failed to generate 3D: ${response.status}`);
    }

    return response.json();
  },

  /**
   * Generate 3D model using the full pipeline (FIBO -> TRIPO)
   * Uses async pipeline with polling for status updates
   */
  generate3D: async (prompt: string, onProgress?: (status: string) => void): Promise<{
    imageUrl: string;
    modelUrl: string;
  }> => {
    // Start the async pipeline
    onProgress?.('Starting 3D generation pipeline...');
    const { job_id } = await api.start3DPipeline(prompt);
    
    onProgress?.(`Pipeline started (Job: ${job_id.slice(0, 8)}...)`);
    
    // Poll for status
    const maxAttempts = 120; // 10 minutes max (5 second intervals)
    for (let i = 0; i < maxAttempts; i++) {
      await wait(5000);
      
      const status = await api.get3DJobStatus(job_id);
      
      switch (status.status) {
        case 'pending':
          onProgress?.('Waiting to start...');
          break;
        case 'generating_image':
          onProgress?.('Generating reference image with FIBO...');
          break;
        case 'generating_3d':
          onProgress?.('Converting to 3D model with TRIPO...');
          break;
        case 'completed':
          onProgress?.('Complete!');
          // If model_url is a local path, prepend the backend URL
          let modelUrl = status.model_url || '';
          if (modelUrl.startsWith('/')) {
            modelUrl = `${MODEL_3D_API_BASE}${modelUrl}`;
          }
          return {
            imageUrl: status.image_url || '',
            modelUrl
          };
        case 'failed':
          throw new Error(status.error || 'Pipeline failed');
      }
    }
    
    throw new Error('Pipeline timed out');
  },

  getAsset: async (id: string): Promise<Asset | null> => {
    await wait(500);
    return {
      id,
      type: '3D',
      prompt: 'Asset',
      thumbnailUrl: 'https://picsum.photos/200',
      fileUrl: '#',
      createdAt: new Date().toISOString()
    };
  }
};
