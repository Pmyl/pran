import { AnimationRun } from '../animation/run/animation-run';
import { PranDroidSkip } from './skip';

export enum ReactionType {
  Moving = "Moving",
  Talking = "Talking",
  CompositeTalking = "CompositeTalking"
}

export interface MovingReaction {
  type: ReactionType.Moving;
  movements: AnimationRun;
  bubble?: string | { text: string; letterByLetter: boolean; };
  skip?: PranDroidSkip;
}

export interface CompositeTalkingReaction {
  type: ReactionType.CompositeTalking;
  reactions: TalkingReaction[];
}

export interface TalkingReaction {
  type: ReactionType.Talking;
  emotion: string;
  phonemes: string[];
  bubble?: string | { text: string; letterByLetter: boolean; };
  skip?: PranDroidSkip;
}

export type PranDroidReaction = MovingReaction | TalkingReaction | CompositeTalkingReaction;