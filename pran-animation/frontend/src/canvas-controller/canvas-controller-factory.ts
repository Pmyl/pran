import { ParentCanvasController } from './canvas-controller';
import { MainCanvasController } from './main-canvas-controller';

export class CanvasControllerFactory {
  public static createFrom(context2d: CanvasRenderingContext2D): MainCanvasController {
    return new ParentCanvasController(context2d);
  }
}
