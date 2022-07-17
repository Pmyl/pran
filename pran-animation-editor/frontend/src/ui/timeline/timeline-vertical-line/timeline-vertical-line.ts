import { PlayerController, PlayerState } from '../../../core/player/player-controller';
import { Immutable, inlineComponent, setPropertyElement, staticElement } from 'pran-gular-frontend';
import './timeline-vertical-line.css';

export type TimelineVerticalLineInputs = { playerController: Immutable<PlayerController>, currentFrame: number, frameWidth: number };

export const createTimelineVerticalLine = inlineComponent<TimelineVerticalLineInputs>(controls => {
  let lineTemplate = staticElement(`<span class="timeline-vertical-line_line"></span>`),
    playerController: Immutable<PlayerController>;

  controls.setup('timeline-vertical-line');
  controls.afterFirstRender = () => {
    hookVerticalLineOnPlay(lineTemplate.staticContent, playerController);
  };

  controls.onInputChange = {
    playerController: pc => playerController = pc,
    currentFrame: (cf, inputs) => setPropertyElement(lineTemplate.staticContent, 'left', `${cf * inputs.frameWidth}px`),
    frameWidth: (fw, inputs) => setPropertyElement(lineTemplate.staticContent, 'left', `${inputs.currentFrame * fw}px`)
  };

  return _ => controls.mandatoryInput('playerController') && lineTemplate;
});

function hookVerticalLineOnPlay(lineElement: HTMLElement, playerController: Immutable<PlayerController>) {
  let isVisible: boolean = true,
    firstTime: boolean = true;

  playerController.onStateChange(state => {
    if (state === PlayerState.Play && !isVisible) {
      lineElement.scrollIntoView({ inline: 'start' });
    }
  });

  const observer = new IntersectionObserver((entries: IntersectionObserverEntry[]) => {
    const lineIntersection = entries[0];

    isVisible = firstTime || lineIntersection.isIntersecting;
    firstTime = false; // FOR SOME REASON INTERSECTION OBSERVER THE FIRST TIME SAYS THAT IT'S NOT IN VIEW EVEN THOUGH IT IS???

    if (!lineIntersection.isIntersecting && playerController.state === PlayerState.Play) {
      lineIntersection.target.scrollIntoView({ inline: 'start' });
    }
  }, {
    root: null,
    rootMargin: "0px",
    threshold: [0, 1]
  });
  observer.observe(lineElement);
}
