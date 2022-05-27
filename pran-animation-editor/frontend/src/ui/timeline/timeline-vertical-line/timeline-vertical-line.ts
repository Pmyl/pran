import { PlayerController, PlayerState } from 'pran-animation-editor-frontend';
import { Immutable, inlineComponent, setProperty, staticElement } from 'pran-gular-frontend';
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
    playerController: pc => playerController = pc
  };
  
  return inputs => controls.mandatoryInput('playerController') && [
    lineTemplate,
    e => (
      setProperty(e, '.timeline-vertical-line_line', 'left', `${inputs.currentFrame * inputs.frameWidth}px`)
    )
  ];
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
