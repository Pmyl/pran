import { MainCanvasController } from './main-canvas-controller';

export interface CanvasController {
  readonly id: string;
  readonly layersCount: number;
  draw(image: HTMLImageElement): void;
  clear(): void;
  dryDraw(image: HTMLImageElement): void;
  dryReplace(image: HTMLImageElement): void;
  dryClear(): void;
  waitForMs(ms: number): Promise<void>;
  addLayer(id: string): CanvasController;
  addLayerAt(id: string, index: number): CanvasController;
  removeLayer(id: string): CanvasController;
  getTranslation(): { x: number, y: number };
  moveTo(translateX: number, translateY: number): void;
  move(translateX: number, translateY: number): void;
  dryMoveTo(translateX: number, translateY: number): void;
  dryMove(translateX: number, translateY: number): void;
}

export class ParentCanvasController implements MainCanvasController {
  public layersCount: number;
  public globalX: number = 0;
  public globalY: number = 0;
  public localX: number = 0;
  public localY: number = 0;
  protected readonly _context2d: CanvasRenderingContext2D;
  private readonly _layers: (typeof ParentCanvasController.LayerCanvasControllerImpl.prototype)[];

  constructor(context2d: CanvasRenderingContext2D) {
    this._context2d = context2d;
    this._layers = [];
    this.layersCount = 0;
  }

  public addLayer(id: string): CanvasController {
    return this.addLayerAt(id, this._layers.length);
  }

  public addLayerAt(id: string, index: number): CanvasController {
    this.layersCount++;
    this._layers.splice(index, 0, new ParentCanvasController.LayerCanvasControllerImpl(this._context2d, this, id, this.globalX, this.globalY));
    return this._layers[index];
  }

  public removeLayer(id: string): CanvasController {
    this.layersCount--;
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

    constructor(context2d: CanvasRenderingContext2D, parent: ParentCanvasController, id: string, parentPositionX: number = 0, parentPositionY: number = 0) {
      super(context2d);
      this._parent = parent;
      this._imagesToDraw = [];
      this.id = id;
      this._moveGlobally(parentPositionX, parentPositionY);
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
        this._context2d.drawImage(this._imagesToDraw[i], Math.round(this.globalX), Math.round(this._context2d.canvas.height - this._imagesToDraw[i].height + this.globalY));
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

    public getTranslation(): { x: number, y: number } {
      return { x: this.localX, y: this.localY };
    }

    public moveTo(translateX: number, translateY: number): void {
      this.move(translateX - this.localX, translateY - this.localY);
    }

    public dryMoveTo(translateX: number, translateY: number): void {
      this.dryMove(translateX - this.localX, translateY - this.localY);
    }

    public move(translateX: number, translateY: number): void {
      this.localX += translateX;
      this.localY += translateY;

      this._moveGlobally(translateX, translateY);
      this._parent.canvasChanged();
    }

    public dryMove(translateX: number, translateY: number): void {
      this.localX += translateX;
      this.localY += translateY;

      this._moveGlobally(translateX, translateY);
    }

    private _moveGlobally(translateX: number, translateY: number): void {
      for (let i = 0; i < this._layers.length; i++) {
        this._layers[i]._moveGlobally(translateX, translateY);
      }

      this.globalX += translateX;
      this.globalY += translateY;
    }
  }
}