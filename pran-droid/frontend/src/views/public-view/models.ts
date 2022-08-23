export type PranDroidReactionDefinitions = Array<PranDroidReactionDefinition>;

export type RewardRedeemTrigger = { type: 'Action', id: string, name: 'reward_redeem' };
export type ReactionTrigger = { type: 'ChatCommand', command: string } | { type: 'ChatKeyword', keyword: string } | RewardRedeemTrigger;
export type ReactionStepSkip = { type: 'AfterStep', extraMs: number } | { type: 'AfterTime', ms: number };
export type ReactionTalkingStepAlternative = { message: { mode: 'Instant', text: string } } & ({ probability: null, _calculatedProbability: number } | { probability: number, _calculatedProbability?: never });
export type ReactionTalkingStep = { type: 'Talking', alternatives: Array<ReactionTalkingStepAlternative>, skip: ReactionStepSkip, emotionId: string };
export type ReactionStep = ReactionTalkingStep | { type: 'Moving' };
export type Emotion = { id: string, name: string };

export interface PranDroidReactionDefinition {
  id: string,
  count: number,
  isDisabled: boolean,
  triggers: Array<ReactionTrigger>,
  steps: Array<ReactionStep>
}