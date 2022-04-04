import { CanvasController } from "../canvas-controller/canvas-controller";
import { clear, draw, wait } from "./helpers";
import { Timeline } from "./timeline";
import { TimelineAction } from "./timeline-action";

describe('timeline', () => {
  interface Fixture {
    timeline: Timeline;
    canvasController: Partial<CanvasController>&{actions:[string, any][]};
  }

  function createMockCanvasController(): Fixture['canvasController'] {
    const actions: [string, any][] = [];

    return {
      actions: actions,
      dryClear: () => {actions.push(['dryClear', null])},
      dryReplace: (image) => {actions.push(['dryReplace', image])}
    };
  }

  function createTimeline(actions: TimelineAction[]): Fixture {
    const canvasController = createMockCanvasController();
    const timeline = new Timeline(canvasController as CanvasController, actions);

    return { timeline, canvasController };
  }

  const createFakeImage = (id: string) => ({ id: id } as any as HTMLImageElement);

  it('should not execute any action when created', () => {
    const fixture = createTimeline([draw(createFakeImage('1'))]);
    expect(fixture.canvasController.actions.length).toBe(0);
  });

  describe('when a single tick happens', () => {
    it('should replace without repainting the canvas with provided image in case of draw action', () => {
      const image = createFakeImage('1');
      const fixture = createTimeline([draw(image)]);
      fixture.timeline.tick(1);
      expect(fixture.canvasController.actions).toEqual([['dryReplace', image]]);
    });

    it('should clear without repainting the canvas in case of clear action', () => {
      const fixture = createTimeline([clear()]);
      fixture.timeline.tick(1);
      expect(fixture.canvasController.actions).toEqual([['dryClear', null]]);
    });

    it('should do nothing in case of none action', () => {
      const fixture = createTimeline([wait(1)]);
      fixture.timeline.tick(1);
      expect(fixture.canvasController.actions).toEqual([]);
    });

    it('should execute only the first action', () => {
      const fixture = createTimeline([clear(), draw(createFakeImage('1'))]);
      fixture.timeline.tick(1);
      expect(fixture.canvasController.actions).toEqual([['dryClear', null]]);
    });
  });

  describe('when a tick of multiple frames happens', () => {
    it('should execute all the actions of the ticked frames', () => {
      const firstImage = createFakeImage('1'),
        secondImage = createFakeImage('2'),
        fixture = createTimeline([
          clear(),
          draw(firstImage),
          draw(secondImage),
          draw(createFakeImage('3')),
          clear()
        ]);

      fixture.timeline.tick(3);

      expect(fixture.canvasController.actions).toEqual([
        ['dryClear', null],
        ['dryReplace', firstImage],
        ['dryReplace', secondImage]
      ]);
    });

    it('should do nothing during the none action frames', () => {
      const firstImage = createFakeImage('1'),
        secondImage = createFakeImage('2'),
        fixture = createTimeline([
          clear(),
          wait(2),
          draw(firstImage),
          draw(secondImage)
        ]);

      fixture.timeline.tick(4);

      expect(fixture.canvasController.actions).toEqual([
        ['dryClear', null],
        ['dryReplace', firstImage]
      ]);
    });
  });

  describe('when multiple ticks happen', () => {
    it('should execute the actions in order', () => {
      const firstImage = createFakeImage('1'),
        secondImage = createFakeImage('2'),
        fixture = createTimeline([
          clear(),
          draw(firstImage),
          draw(secondImage),
          draw(createFakeImage('3')),
          clear()
        ]);

      fixture.timeline.tick(1);
      fixture.timeline.tick(2);

      expect(fixture.canvasController.actions).toEqual([
        ['dryClear', null],
        ['dryReplace', firstImage],
        ['dryReplace', secondImage]
      ]);
    });

    it('should do nothing during the none action frames', () => {
      const firstImage = createFakeImage('1'),
        secondImage = createFakeImage('2'),
        fixture = createTimeline([
          clear(),
          wait(2),
          draw(firstImage),
          draw(secondImage)
        ]);

      fixture.timeline.tick(1);
      fixture.timeline.tick(1);
      fixture.timeline.tick(1);
      fixture.timeline.tick(1);

      expect(fixture.canvasController.actions).toEqual([
        ['dryClear', null],
        ['dryReplace', firstImage]
      ]);
    });
  });

  describe('when restarting', () => {
    it('should not execute any extra action', () => {
      const firstImage = createFakeImage('1'),
        secondImage = createFakeImage('2'),
        fixture = createTimeline([
          clear(),
          draw(firstImage),
          draw(secondImage)
        ]);

      fixture.timeline.tick(1);
      fixture.timeline.restart();

      expect(fixture.canvasController.actions).toEqual([
        ['dryClear', null]
      ]);
    });

    it('should restart executing actions from the first one', () => {
      const firstImage = createFakeImage('1'),
        secondImage = createFakeImage('2'),
        fixture = createTimeline([
          clear(),
          draw(firstImage),
          draw(secondImage)
        ]);

      fixture.timeline.tick(1);
      fixture.timeline.restart();
      fixture.timeline.tick(1);

      expect(fixture.canvasController.actions).toEqual([
        ['dryClear', null],
        ['dryClear', null]
      ]);
    });
  });

  describe('when the timeline does not loop', () => {
    describe('when a tick goes past the last action', () => {
      it('should stop executing actions', () => {
        const firstImage = createFakeImage('1'),
          secondImage = createFakeImage('2'),
          fixture = createTimeline([
            clear(),
            draw(firstImage),
            draw(secondImage),
            clear()
          ]);

        fixture.timeline.tick(5);
        fixture.timeline.tick(1);
        fixture.timeline.tick(2);

        expect(fixture.canvasController.actions).toEqual([
          ['dryClear', null],
          ['dryReplace', firstImage],
          ['dryReplace', secondImage],
          ['dryClear', null],
        ]);
      });
    });
  });

  describe('when the timeline loops', () => {
    describe('when a tick goes past the last action', () => {
      it('should loop back to the beginning and keep executing actions', () => {
        const firstImage = createFakeImage('1'),
          secondImage = createFakeImage('2'),
          fixture = createTimeline([
            clear(),
            draw(firstImage),
            draw(secondImage),
            clear()
          ]);
        fixture.timeline.activateLoop();

        fixture.timeline.tick(3);
        fixture.timeline.tick(1);
        fixture.timeline.tick(5);

        expect(fixture.canvasController.actions).toEqual([
          ['dryClear', null],
          ['dryReplace', firstImage],
          ['dryReplace', secondImage],
          ['dryClear', null],

          ['dryClear', null],
          ['dryReplace', firstImage],
          ['dryReplace', secondImage],
          ['dryClear', null],

          ['dryClear', null],
        ]);
      });
    });
  });
});