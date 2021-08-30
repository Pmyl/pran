import './animation-editor.css';

import { Animator, AnimatorManager } from 'pran-animation-frontend';
import { CanvasControllerFactory } from 'pran-phonemes-frontend';
import { EditorQueue, EditorRedoEvent, EditorUndoEvent } from '../../core/editor-queue/editor-queue';
import { Mediator } from '../../core/mediator/mediator';
import { PlayerController } from '../../core/player/player-controller';
import { createBlockEditor } from '../block/block-editor/block-editor';
import { Component } from '../framework/component';
import { Container } from '../framework/container';
import { inlineComponent } from '../framework/inline-component';
import { Player } from '../player/player';
import { createTimelineBoard } from '../timeline/timeline-board/timeline-board';

const componentName = 'animation-editor';

export type PranEditorControls = {
  playerController: PlayerController;
  animatorManager: AnimatorManager;
  animator: Animator;
};

export const createAnimationEditor = inlineComponent<{ customPanel?: Component<PranEditorControls>, onInit?: (controls: PranEditorControls) => void }>(controls => {
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

  document.addEventListener('keydown', e => {
    if (e.ctrlKey && !e.shiftKey && e.code === 'KeyZ') {
      Mediator.raiseEvent<EditorUndoEvent>('undoEditorAction');
    }
  });

  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyZ') {
      Mediator.raiseEvent<EditorRedoEvent>('redoEditorAction');
    }
  });

  controls.onInputsChange = async inputs => {
    if (initialized) throw new Error(`Cannot provide inputs multiple times to '${componentName}'`);
    initialized = true;

    const manager = await AnimatorManager.create(CanvasControllerFactory.createFrom(context), [
      ['fv', './resources/mouth/f,v.png'],
      ['ur', './resources/mouth/u,r.png'],
      ['stch', './resources/mouth/s,t,ch.png'],
      ['mbsilent', './resources/mouth/m,b,silent.png'],
      ['p1', './resources/mouth/p-1.png'],
      ['p2', './resources/mouth/p-2.png'],
      ['e', './resources/mouth/e.png'],
      ['aah', './resources/mouth/a,ah.png'],
      ['o', './resources/mouth/ooh.png'],
      ['ld', './resources/mouth/l,d.png'],
      ['pause', './resources/mouth/pause.png'],
      ['smile', './resources/mouth/smile.png'],
      ['head_idle', './resources/idle_0000.png'],
      ['eyes_open', './resources/eyes/eyes_0000.png'],
      ['eyes_semi_open', './resources/eyes/eyes_0001.png'],
      ['eyes_closed', './resources/eyes/eyes_0002.png'],
    ]);

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
  };

  return () => [topSection, bottomSection];
});