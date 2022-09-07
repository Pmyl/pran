import { PranDroidAnimationPlayer } from '../animation/pran-droid-animation-player';
import { AnimationRun } from '../animation/run/animation-run';
import { waitFor } from '../helpers/async';
import { SpeechBubble } from '../speech-bubble/speech-bubble';
import { Emotion } from './emotion';
import { CompositeTalkingReaction, MovingReaction, PranDroidReaction, ReactionType, TalkingReaction } from './reaction';
import { SkipType } from './skip';

export class PranDroid {
  private _animationPlayer: PranDroidAnimationPlayer;
  private _speechBubble: SpeechBubble;
  private _idleAnimation: AnimationRun;

  private _isReacting: boolean;
  private _reactionQueue: PranDroidReaction[] = [];
  private _emotionRange: { [emotion: string]: Emotion } = {};

  constructor(animationPlayer: PranDroidAnimationPlayer, speechBubble: SpeechBubble) {
    this._animationPlayer = animationPlayer;
    this._speechBubble = speechBubble;
  }

  public setIdle(idleAnimation: AnimationRun): void {
    this._idleAnimation = idleAnimation;
  }

  public setEmotionRange(emotionRange: { [emotion: string]: Emotion }): void {
    this._emotionRange = emotionRange;
  }

  public setEmotions(emotions: Emotion[]): void {
    emotions.forEach(emotion => {
      this._emotionRange[emotion.id] = emotion;
    });
  }

  public getEmotionRange(): { [emotion: string]: Emotion } {
    return this._emotionRange;
  }

  public start(): void {
    this._stayIdling();
    this._isReacting = false;
  }

  public react(reactions: PranDroidReaction[]): void {
    this._reactionQueue.push(...reactions);
    this._move();
  }

  private _move(): void {
    if (this._isReacting) {
      return;
    }

    this._isReacting = true;

    (async() => {
      let reaction;

      while (reaction = this._reactionQueue.shift()) {
        await this._executeReaction(reaction);
      }

      this._isReacting = false;
      this._stayIdling();
    })();
  }

  private _stayIdling(): void {
    this._animationPlayer.play(this._idleAnimation);
    this._speechBubble.clearBubble();
  }

  private _executeReaction(reaction: PranDroidReaction): Promise<void> {
    switch (reaction.type) {
      case ReactionType.Moving:
        return this._executeMoveReaction(reaction);
      case ReactionType.Talking:
        return this._executeTalkReaction(reaction);
      case ReactionType.CompositeTalking:
        return this._executeCompositeReaction(reaction);
    }
  }

  private async _executeMoveReaction(reaction: MovingReaction) {
    const animationExecution = this._animationPlayer.play(reaction.movements);
    const speechResult = this._showBubble(reaction);
    await this._waitReactionTime(reaction, speechResult, animationExecution);
  }

  private async _executeTalkReaction(reaction: TalkingReaction) {
    const emotion = this._getEmotion(reaction.emotion);
    const speechResult = this._showBubble(reaction);
    const animationExecution = this._animationPlayer.play(emotion.speak(reaction.phonemes, speechResult.durationMs));
    await this._waitReactionTime(reaction, speechResult, animationExecution);
  }

  private async _executeCompositeReaction(compositeReaction: CompositeTalkingReaction): Promise<void> {
    this._speechBubble.openBubble();
    for (const reaction of compositeReaction.reactions) {
      await this._executeTalkReaction(reaction);
    }
    this._speechBubble.closeBubble();
  }

  private _waitReactionTime(reaction: MovingReaction | TalkingReaction, speechResult: { durationMs: number }, animationExecution: Promise<unknown>): Promise<unknown> {
    const skip = reaction.skip;

    if (this._isSkipAfterMs(skip)) {
      return waitFor(skip.ms);
    } else {
      return Promise.all([animationExecution, waitFor(speechResult.durationMs)])
        .then(() => waitFor((skip?.extraMs || 0)));
    }
  }

  private _showBubble(reaction: MovingReaction | TalkingReaction) {
    let speechResult = { durationMs: 0 };

    if (reaction.bubble) {
      if (typeof reaction.bubble === 'string') {
        speechResult = this._speechBubble.drawSpeech(reaction.bubble);
      } else {
        speechResult = this._speechBubble.drawSpeech(reaction.bubble.text, { letterByLetter: reaction.bubble.letterByLetter });
      }
    } else {
      this._speechBubble.clearBubble();
    }
    return speechResult;
  }

  private _getEmotion(emotion: string): Emotion {
    return this._emotionRange[emotion];
  }

  private _isSkipAfterMs(skip: (MovingReaction | TalkingReaction)['skip'] | undefined): skip is { type: SkipType.AfterTime, ms: number } {
    return skip.type === SkipType.AfterTime;
  }
}