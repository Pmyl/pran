import { MainCanvasController } from './main-canvas-controller';

export interface CanvasController {
  id: string;
  draw(image: HTMLImageElement): void;
  clear(): void;
  dry_draw(image: HTMLImageElement): void;
  dry_replace(image: HTMLImageElement): void;
  dry_clear(): void;
  waitForMs(ms: number): Promise<void>;
  addLayer(id: string): CanvasController;
}

export class ParentCanvasController implements MainCanvasController {
  protected readonly _context2d: CanvasRenderingContext2D;
  private readonly _layers: (typeof ParentCanvasController.LayerCanvasControllerImpl.prototype)[];

  constructor(context2d: CanvasRenderingContext2D) {
    this._context2d = context2d;
    this._layers = [];
  }

  public addLayer(id: string): CanvasController {
    this._layers.push(new ParentCanvasController.LayerCanvasControllerImpl(this._context2d, this, id));
    return this._layers[this._layers.length - 1];
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
    for (let i = 0; i < this._layers.length; i++) {
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

    public dry_clear(): void {
      this._imagesToDraw = [];
    }

    public draw(image: HTMLImageElement): void {
      this._imagesToDraw.push(image);
      this._parent.canvasChanged();
    }

    public dry_draw(image: HTMLImageElement): void {
      this._imagesToDraw.push(image);
    }

    public dry_replace(image: HTMLImageElement): void {
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