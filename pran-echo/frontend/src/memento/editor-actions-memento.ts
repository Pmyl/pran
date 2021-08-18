import { IEvent, Mediator } from '../services/mediator';

export type EditorDoActionEvent = IEvent<'doEditorAction', EditorAction>;
export type EditorUndoEvent = IEvent<'undoEditorAction', void>;
export type EditorRedoEvent = IEvent<'redoEditorAction', void>;

export interface EditorAction {
  name: string;
  do(): void;
  undo(): void;
}

export function combine(name: string, ...editorActions: EditorAction[]): EditorAction {
  return {
    name,
    do() {
      editorActions.forEach(a => {
        a.do();
      });
    },
    undo() {
      editorActions.slice().reverse().forEach(a => {
        a.undo();
      });
    }
  };
}

export function invert(name: string, editorAction: EditorAction): EditorAction {
  return {
    name,
    do: editorAction.undo,
    undo: editorAction.do
  };
}

export class EditorActionsMemento {
  public get actions(): readonly EditorAction[] {
    return this._actions;
  }
  public get index(): number {
    return this._index;
  }

  private _actions: EditorAction[] = [];
  private _index: number = 0;
  
  public constructor(max: number = 50) {
    Mediator.onEvent<EditorDoActionEvent>('doEditorAction', a => {
      if (this._actions.length !== this._index) {
        this._actions.splice(this._index, this._actions.length - this._index);
      }
      if (this._actions.length === max) {
        this._actions.shift();
      }

      a.do();
      this._actions.push(a);
      this._index = this._actions.length;
    });

    Mediator.onEvent<EditorUndoEvent>('undoEditorAction', () => {
      if (this._index === 0) {
        return;
      }

      const lastAction = this._actions[this._index - 1];
      lastAction.undo();
      this._index--;
    });

    Mediator.onEvent<EditorRedoEvent>('redoEditorAction', () => {
      if (this._actions.length === this._index) {
        return;
      }

      this._index++;
      this._actions[this._index - 1].do();
    });
  }
}