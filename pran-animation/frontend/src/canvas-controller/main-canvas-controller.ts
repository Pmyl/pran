import { CanvasController } from './canvas-controller';

export interface MainCanvasController {
  layersCount: number;
  addLayer(id: string): CanvasController;
  addLayerAt(id: string, index: number): CanvasController;
  removeLayer(id: string): CanvasController;
  clear(): void;
  redraw(): void;
}