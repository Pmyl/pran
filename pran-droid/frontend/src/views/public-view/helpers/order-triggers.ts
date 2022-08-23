import { ReactionTrigger } from '../models';

export function orderTriggers(triggers: ReactionTrigger[]) {
  const ordering = {};
  const sortOrder: ReactionTrigger['type'][] = ['ChatCommand', 'ChatKeyword', 'Action'];

  for (let i = 0; i < sortOrder.length; i++) {
    ordering[sortOrder[i]] = i;
  }

  triggers.sort( function(a, b) {
    return (ordering[a.type] - ordering[b.type]) || a.type.localeCompare(b.type);
  });
}