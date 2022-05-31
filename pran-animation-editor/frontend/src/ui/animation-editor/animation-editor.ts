import { Animator, AnimatorManager, CanvasControllerFactory } from 'pran-animation-frontend';
import { Component, Container, inlineComponent } from 'pran-gular-frontend';
import { EditorQueue, EditorRedoEvent, EditorUndoEvent } from '../../core/editor-queue/editor-queue';
import { Mediator } from '../../core/mediator/mediator';
import { PlayerController, PlayerState } from '../../core/player/player-controller';
import { createBlockEditor } from '../block/block-editor/block-editor';
import { Player } from '../player/player';
import { createTimelineBoard } from '../timeline/timeline-board/timeline-board';
import './animation-editor.css';

const componentName = 'animation-editor';

export type PranEditorControls = {
  playerController?: PlayerController;
  animatorManager?: AnimatorManager;
  animator?: Animator;
};

export interface AnimationEditorInput {
  imagesMap: [id: string, url: string][];
  customPanel?: Component<PranEditorControls>;
  onInit?: (controls: PranEditorControls) => void;
}

export const createAnimationEditor = inlineComponent<AnimationEditorInput>(controls => {
  let initialized: boolean = false;
  controls.setup(componentName, componentName);

  const player = new Player();
  const topSection: Container = Container.CreateEmptyElement('section', 'animation-editor_top-section');
  const topLeftContainer: Container = Container.CreateEmptyElement(topSection, 'div', 'animation-editor_top-left-container');
  const playerContainer: Container = Container.CreateEmptyElement(topSection, 'div', 'animation-editor_player-container');
  const context = (player.canvas.componentElement as HTMLCanvasElement).getContext('2d');
  const editControlsContainer: Container = Container.CreateEmptyElement(topSection, 'div', 'animation-editor_edit-controls-container');
  const bottomSection: Container = Container.CreateEmptyElement('section', 'animation-editor_bottom-section');

  EditorQueue.init();

  controls.onInputsChange = async inputs => {
    if (initialized) throw new Error(`Cannot provide inputs multiple times to '${componentName}'`);
    initialized = true;

    const manager = await AnimatorManager.create(CanvasControllerFactory.createFrom(context), inputs.imagesMap);

    const animator: Animator = manager.animate([]);
    const playerController = new PlayerController(animator);
    playerController.setFps(60);
  
    player.setInput('playerController', playerController)
      .appendTo(playerContainer);
  
    createBlockEditor({ animatorManager: manager, animator })
      .appendTo(editControlsContainer);
  
    createTimelineBoard().setInputs({ animator, playerController, frameWidth: 20 })
      .appendTo(bottomSection);

    inputs.onInit?.({ playerController, animatorManager: manager, animator });
    inputs.customPanel && (
      inputs.customPanel.setInputs({ animator: animator, animatorManager: manager, playerController }),
      topLeftContainer.append(inputs.customPanel)
    );
    controls.changed();

    setupShortcuts(playerController);
  };

  return () => [topSection, bottomSection];
});

const setupShortcuts = (playerController: PlayerController) => {
  document.addEventListener('keydown', e => {
    const activeElement = document.activeElement;
    
    if (!!activeElement) {
      if (['a', 'button'].includes(activeElement.tagName.toLowerCase())) {
        document.body.focus();
        e.preventDefault();
      } else if (['input', 'select', 'textarea'].includes(activeElement.tagName.toLowerCase())) {
        return;
      }
    }

    if (e.ctrlKey && !e.shiftKey && e.code === 'KeyZ') {
      Mediator.raiseEvent<EditorUndoEvent>('undoEditorAction');
    }

    if (e.ctrlKey && e.shiftKey && e.code === 'KeyZ') {
      Mediator.raiseEvent<EditorRedoEvent>('redoEditorAction');
    }

    if (e.code === 'Space') {
      if (playerController.state === PlayerState.Play || playerController.state === PlayerState.End) {
        playerController.pause();
      } else {
        playerController.play();
      }
    }

    if (e.code === 'KeyS') {
      playerController.stop();
    }
  });
};