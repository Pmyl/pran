import { CanvasController } from './canvas-controller';

export interface MainCanvasController {
  addLayer(id: string): CanvasController;
  clear(): void;
  redraw(): void;
}