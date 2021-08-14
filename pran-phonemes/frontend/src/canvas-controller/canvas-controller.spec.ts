import { CanvasControllerFactory } from './canvas-controller-factory';

describe('canvas-controller', () => {
  function createFakeContext(): CanvasRenderingContext2D&{actions:[string, any][]} {
    const actions: [string, any][] = [];

    return {
      actions: actions,
      clearRect: () => {actions.push(['clearRect', null])},
      drawImage: (image) => {actions.push(['drawImage', image])},
      canvas: {}
    } as any as CanvasRenderingContext2D&{actions:[string, any][]};
  }
  
  const createFakeImage = (id: string) => ({ id: id } as any as HTMLImageElement);
  const fakeImage = createFakeImage('reusable fake');
  const getDraws = (context: {actions:[string, any][]}) => context.actions.filter(x => x[0] === 'drawImage');

  it('should not redraw cleared layer', () => {
    const fakeContext2d = createFakeContext();
    const controller = CanvasControllerFactory.createFrom(fakeContext2d);
    const layer1 = controller.addLayer('layer1');

    layer1.draw(fakeImage)
    layer1.clear();
    expect(getDraws(fakeContext2d).length).toBe(1);
  });

  it('should not redraw cleared layer when multiple layers', () => {
    const fakeContext2d = createFakeContext();
    const controller = CanvasControllerFactory.createFrom(fakeContext2d);
    controller.addLayer('layer0');
    const layer1 = controller.addLayer('layer1');
    controller.addLayer('layer2');

    layer1.draw(fakeImage)
    layer1.clear();
    expect(getDraws(fakeContext2d).length).toBe(1);
  });

  it('should redraw other layers when drawing a layer', () => {
    const fakeContext2d = createFakeContext();
    const controller = CanvasControllerFactory.createFrom(fakeContext2d);
    const layer0 = controller.addLayer('layer0');
    const layer1 = controller.addLayer('layer1');
    const layer2 = controller.addLayer('layer2');

    layer0.draw(createFakeImage('0'));
    layer1.draw(createFakeImage('1'));
    layer2.draw(createFakeImage('2'));

    const explicitDrawCount = 3;
    const expectedRedrawOnDrawCount = 1 + 2;
    const draws = getDraws(fakeContext2d);

    expect(draws.length).toBe(explicitDrawCount + expectedRedrawOnDrawCount);
  });

  it('should redraw other layers when clearing a layer', () => {
    const fakeContext2d = createFakeContext();
    const controller = CanvasControllerFactory.createFrom(fakeContext2d);
    const layer0 = controller.addLayer('layer0');
    const layer1 = controller.addLayer('layer1');
    const layer2 = controller.addLayer('layer2');

    layer0.draw(createFakeImage('0'));
    layer1.draw(createFakeImage('1'));
    layer2.draw(createFakeImage('2'));
    layer0.clear();

    const explicitDrawCount = 3;
    const redrawCount = 3;
    const expectedRedrawOnClearCount = 2;
    const draws = getDraws(fakeContext2d);

    expect(draws.length).toBe(explicitDrawCount + redrawCount + expectedRedrawOnClearCount);
  });

  it('should not redraw cleared nested layer', () => {
    const fakeContext2d = createFakeContext();
    const controller = CanvasControllerFactory.createFrom(fakeContext2d);
    const layer0 = controller.addLayer('layer0');
    controller.addLayer('layer1');
    const nestedLayer0 = layer0.addLayer('layer2');

    nestedLayer0.draw(fakeImage);
    nestedLayer0.clear();

    expect(getDraws(fakeContext2d).length).toBe(1);
  });

  it('should redraw other layers when clearing nested layer', () => {
    const fakeContext2d = createFakeContext();
    const controller = CanvasControllerFactory.createFrom(fakeContext2d);
    const layer0 = controller.addLayer('layer0');
    const layer1 = controller.addLayer('layer1');
    const layer2 = controller.addLayer('layer2');
    const nestedLayer1_0 = layer1.addLayer('nestedLayer1_0');
    const nestedLayer1_1 = layer1.addLayer('nestedLayer1_1');
    const nestedLayer2_0 = layer2.addLayer('nestedLayer2_0');

    layer0.draw(fakeImage);
    layer1.draw(fakeImage);
    layer2.draw(fakeImage);
    nestedLayer1_0.draw(fakeImage);
    nestedLayer1_1.draw(fakeImage);
    nestedLayer2_0.draw(fakeImage);
    nestedLayer1_1.clear();

    const initialDrawCount = 6;
    const redrawCount = 15;
    const expectedRedrawCount = 5;

    expect(getDraws(fakeContext2d).length).toBe(initialDrawCount + redrawCount + expectedRedrawCount);
  });
});