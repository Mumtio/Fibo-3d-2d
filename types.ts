export type GenType = '3D' | 'SPRITE';

export type GenerationStatus = 'idle' | 'generating' | 'completed' | 'failed';

export interface GenerationStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed';
  description?: string;
}

export interface Asset {
  id: string;
  type: GenType;
  thumbnailUrl: string;
  fileUrl: string;
  createdAt: string;
  prompt: string;
  metadata?: any;
}

export interface SpriteConfig {
  style: string;
  frameCount: number;
  animationType: string;
}

export interface ThreeDConfig {
  style: string;
  format: 'glb' | 'obj';
}

export interface GeneratedResult {
  url: string; // URL to GLB or Sprite Sheet
  previewUrl: string; // GIF or Screenshot
  metadata: any;
}