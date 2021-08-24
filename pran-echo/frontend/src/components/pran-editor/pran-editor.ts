import './pran-editor.css';

import { ActionType, Animator, AnimatorManager, ManagerTimelineAction } from 'pran-animation-frontend';
import { CanvasControllerFactory, cmuPhonemesMap, phonemesMapper } from 'pran-phonemes-frontend';
import { EditorQueue, EditorRedoEvent, EditorUndoEvent } from '../../editor-queue/editor-queue';
import { Component } from '../../framework/component';
import { inlineComponent } from '../../framework/inline-component';
import { Mediator } from '../../services/mediator';
import { PlayerController } from '../../services/player-controller';
import { createBlockEditor } from '../block-editor/block-editor';
import { Container } from '../container/container';
import { Player } from '../player/player';
import { createTimelineBoard } from '../timeline-board/timeline-board';

const componentName = 'editor';
const draw = (id: string): ManagerTimelineAction => ({ type: ActionType.Draw, imageId: id });
const wait = (amount: number): ManagerTimelineAction => ({ type: ActionType.None, amount });

type PranEditorControls = {
  playerController: PlayerController;
  animatorManager: AnimatorManager;
  animator: Animator;
};

export const createPranEditor = inlineComponent<{ customPanel?: Component<{ animator: Animator, animatorManager: AnimatorManager }>, onInit?: (controls: PranEditorControls) => void }>(controls => {
  let initialized: boolean = false;
  controls.setup(componentName, componentName);

  const player = new Player();
  const topSection: Container = Container.CreateEmptyElement('section', 'top-section');
  const topLeftContainer: Container = Container.CreateEmptyElement(topSection, 'div', 'top-left-container');
  const playerContainer: Container = Container.CreateEmptyElement(topSection, 'div', 'player-container');
  const context = (player.canvas.componentElement as HTMLCanvasElement).getContext('2d');
  const editControlsContainer: Container = Container.CreateEmptyElement(topSection, 'div', 'edit-controls-container');
  const bottomSection: Container = Container.CreateEmptyElement('section', 'bottom-section');

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
    ])
    
    // TODO: Remove from here, editor should start fresh, just create an empty animator
    const mouthMovementsImagesIds = phonemesMapper('HH EH L OW , M AY N EY M ZH P R AH N EH S AH .'.split(' '), {
      fv: 'fv',
      ur: 'ur',
      stch: 'stch',
      mbsilent: 'mbsilent',
      p1: 'p1',
      p2: 'p2',
      e: 'e',
      aah: 'aah',
      o: 'o',
      ld: 'ld',
      pause: 'pause',
      smile: 'smile',
    }, cmuPhonemesMap);
  
    const animator = manager.animate(
      [
        draw('head_idle'),
      ],
      [
        draw('eyes_open'),
        wait(20),
        draw('eyes_semi_open'),
        wait(3),
        draw('eyes_closed'),
        wait(3),
        draw('eyes_semi_open'),
        wait(3),
        draw('eyes_open'),
      ],
      mouthMovementsImagesIds.flatMap(id => (
        [draw(id), wait(5)]
      ))
    );
    // TODO: Remove to here
  
    const playerController = new PlayerController(animator);
    playerController.setFps(60);
  
    player.setInput('playerController', playerController)
      .appendTo(playerContainer);
  
    createBlockEditor({ animatorManager: manager })
      .appendTo(editControlsContainer);
  
    createTimelineBoard().setInputs({ animator, playerController, frameWidth: 20 })
      .appendTo(bottomSection);

    inputs.onInit?.({ playerController, animatorManager: manager, animator });
    inputs.customPanel && (
      inputs.customPanel.setInputs({ animator: animator, animatorManager: manager }),
      topLeftContainer.append(inputs.customPanel)
    );
    controls.changed();
  };

  return () => [topSection, bottomSection];
});