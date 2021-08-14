import { CanvasController } from '../canvas-controller/canvas-controller';

export async function mouthAnimation(images: HTMLImageElement[], canvasController: CanvasController) {
  for (let i = 0; i < images.length; i++) {
    canvasController.clear();
    canvasController.draw(images[i]);
    
    if (i !== images.length - 1) {
      await canvasController.waitForMs(100);
    }
  }
}