import { MainCanvasController } from './main-canvas-controller';

export interface CanvasController {
  id: string;
  draw(image: HTMLImageElement): void;
  clear(): void;
  dryDraw(image: HTMLImageElement): void;
  dryReplace(image: HTMLImageElement): void;
  dryClear(): void;
  waitForMs(ms: number): Promise<void>;
  addLayer(id: string): CanvasController;
  addLayerAt(id: string, index: number): CanvasController;
}

export class ParentCanvasController implements MainCanvasController {
  protected readonly _context2d: CanvasRenderingContext2D;
  private readonly _layers: (typeof ParentCanvasController.LayerCanvasControllerImpl.prototype)[];

  constructor(context2d: CanvasRenderingContext2D) {
    this._context2d = context2d;
    this._layers = [];
  }

  public addLayer(id: string): CanvasController {
    return this.addLayerAt(id, this._layers.length);
  }

  public addLayerAt(id: string, index: number): CanvasController {
    this._layers.splice(index, 0, new ParentCanvasController.LayerCanvasControllerImpl(this._context2d, this, id));
    return this._layers[index];
  }

  public removeLayer(id: string): CanvasController {
    return this._layers.splice(this._layers.findIndex(l => l.id === id), 1)[0];
  }

  public clear(): void {
    this._context2d.clearRect(0, 0, this._context2d.canvas.width, this._context2d.canvas.height);
  }

  public canvasChanged(): void {
    this.clear();
    this.redrawSubLayers();
  }

  public redraw(): void {
    this.clear();
    this.redrawSubLayers();
  }

  protected redrawSubLayers() {
    for (let i = this._layers.length - 1; i >= 0; i--) {
      this._layers[i].redraw();
      this._layers[i].redrawSubLayers();
    }
  }

  private static LayerCanvasControllerImpl = class LayerCanvasController extends ParentCanvasController implements CanvasController {
    public readonly id: string;
    private readonly _parent: ParentCanvasController;
    private _imagesToDraw: HTMLImageElement[];
  
    constructor(context2d: CanvasRenderingContext2D, parent: ParentCanvasController, id: string) {
      super(context2d);
      this._parent = parent;
      this._imagesToDraw = [];
      this.id = id;
    }

    public clear(): void {
      this._imagesToDraw = [];
      this._parent.canvasChanged();
    }

    public dryClear(): void {
      this._imagesToDraw = [];
    }

    public draw(image: HTMLImageElement): void {
      this._imagesToDraw.push(image);
      this._parent.canvasChanged();
    }

    public dryDraw(image: HTMLImageElement): void {
      this._imagesToDraw.push(image);
    }

    public dryReplace(image: HTMLImageElement): void {
      this._imagesToDraw = [image];
    }

    public redraw(): void {
      for (let i = 0; i < this._imagesToDraw.length; i++) {
        this._context2d.drawImage(this._imagesToDraw[i], 0, 0);
      }
    }

    public waitForMs(ms: number): Promise<void> {
      return new Promise(r => {
        setTimeout(() => r(), ms);
      });
    }

    public canvasChanged(): void {
      this._parent.canvasChanged();
    }
  }
}