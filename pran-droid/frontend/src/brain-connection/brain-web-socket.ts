import { CompositeTalkingReaction, ReactionType, TalkingReaction } from '../droid/reaction';
import { PranDroidSkip } from '../droid/skip';

export type BrainAnimation = { frameStart: number, frameEnd: number, imageId: string }[];

export interface BrainMovingReaction {
  type: ReactionType.Moving;
  animation: BrainAnimation;
  bubble?: string | { text: string; letterByLetter: boolean; };
  skip?: PranDroidSkip;
}

export type DroidBrainReaction = { steps: (BrainMovingReaction | TalkingReaction | CompositeTalkingReaction)[] };

class WebSocketConnectionTool {
  private static readonly DELAY_TIME: number = 10000;
  private readonly _init: () => void;
  private _lastTryTime: number;

  constructor(init: () => void) {
    this._init = init;
  }

  public connect(): void {
    const elapsedFromLastConnection: number = Date.now() - this._lastTryTime;

    setTimeout(() => {
      this._init();
      this._lastTryTime = Date.now();
    }, Math.max(0, WebSocketConnectionTool.DELAY_TIME - elapsedFromLastConnection));
  }
}

export class BrainWebSocket {
  private _websocket: WebSocket;
  private _connectionTool: WebSocketConnectionTool;

  constructor(onReaction: (reaction: DroidBrainReaction) => unknown) {
    this._connectionTool = new WebSocketConnectionTool(() => this._initConnection(onReaction));
    this._connectionTool.connect();
  }

  private _initConnection(onReaction: (reaction: DroidBrainReaction) => unknown) {
    console.log('Connecting to websocket');
    this._websocket = new WebSocket('ws://localhost:8080');

    this._websocket.addEventListener('open', () => {
      console.log('Connected to websocket');
      this._websocket.send('Hello Server!');
    });

    this._websocket.addEventListener('close', () => {
      console.log('Websocket connection closed');
      this._connectionTool.connect();
    });

    this._websocket.addEventListener('message', function(event) {
      try {
        let reaction = JSON.parse(event.data);
        console.log('Input received from websocket', reaction);
        onReaction(reaction);
      } catch (e) {
        console.error("Message received from websocket, error occurred", e);
      }
    });
  }
}