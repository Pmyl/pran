import { CanvasController } from '../src/canvas-controller/canvas-controller';
import { CanvasControllerFactory } from '../src/canvas-controller/canvas-controller-factory';
import { MainCanvasController } from '../src/canvas-controller/main-canvas-controller';
import { phonemesMapper } from '../src/mapper/phonemes-mapper';
import { mouthAnimation } from '../src/mouth-animation/mouth-animation';

const pranImage = new Image();
pranImage.src = './resources/idle_0000.png';

const pranEyes = new Image();
pranEyes.src = './resources/eyes/eyes_0000.png';

document.addEventListener('DOMContentLoaded', () => {
  const context: CanvasRenderingContext2D = (document.getElementById('canvas') as HTMLCanvasElement).getContext('2d');

  const mainCanvasController: MainCanvasController = CanvasControllerFactory.createFrom(context);
  const backgroundLayer: CanvasController = mainCanvasController.addLayer('bg');
  const mouthLayer: CanvasController = mainCanvasController.addLayer('mouth');

  backgroundLayer.draw(pranImage);
  backgroundLayer.draw(pranEyes);

  const images = loadAllImages([
    './resources/mouth/f,v.png',
    './resources/mouth/u,r.png',
    './resources/mouth/s,t,ch.png',
    './resources/mouth/m,b,silent.png',
    './resources/mouth/p-1.png',
    './resources/mouth/p-2.png',
    './resources/mouth/e.png',
    './resources/mouth/a,ah.png',
    './resources/mouth/ooh.png',
    './resources/mouth/l,d.png',
    './resources/mouth/pause.png',
    './resources/mouth/smile.png',
  ]);

  document.getElementById('text').addEventListener('input', (e) => {
    const content: string = ((e as InputEvent).target as HTMLInputElement).value;

    try {
      const result: HTMLImageElement[] = phonemesMapper<HTMLImageElement>(content.split(' '), {
        fv: images[0],
        ur: images[1],
        stch: images[2],
        mbsilent: images[3],
        p1: images[4],
        p2: images[5],
        e: images[6],
        aah: images[7],
        o: images[8],
        ld: images[9],
        pause: images[10],
        smile: images[11],
      });

      mouthAnimation(result, mouthLayer);
    } catch {
      console.info('error during mapping');
    }
  });
});

function loadAllImages(imagesPath: string[]): HTMLImageElement[] {
  return imagesPath.map(i => {
    const image = new Image();
    image.src = i;

    return image;
  });
}
