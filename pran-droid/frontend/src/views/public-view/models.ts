export type PranDroidReactionDefinitions = Array<PranDroidReactionDefinition>;

export type ReactionTrigger = { type: 'ChatCommand', command: string } | { type: 'ChatKeyword', keyword: string };
export type ReactionTalkingStepAlternative = { message: { text: string }, probability: number };
export type ReactionStep = { type: 'Talking', alternatives: Array<ReactionTalkingStepAlternative> } | { type: 'Moving' };

export interface PranDroidReactionDefinition {
  id: string,
  count: number,
  isDisabled: boolean,
  triggers: Array<ReactionTrigger>,
  steps: Array<ReactionStep>
}