import { inlineComponent } from 'pran-gular-frontend';
import { authorize } from '../../helpers/is-authorized';
import { retryFetch } from '../../helpers/retry-fetch';
import { reactionsTable } from '../public-view/components/table';
import { PranDroidReactionDefinitions } from '../public-view/models';

export const managementView = inlineComponent(controls => {
  authorize();
  controls.setup("management-view", "management-view");
  controls.setComplexRendering();

  let reactions: PranDroidReactionDefinitions;

  (async () => {
    reactions = (await retryFetch("/api/reactions").then(r => r.json())).data;
    controls.changed();
  })();

  const toggleDisableHandler = reactionId => {
    const reaction = reactions.find(reaction => reaction.id === reactionId);
    retryFetch(`/api/reactions/${reaction.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDisabled: !reaction.isDisabled })
    }).then(response => response.json())
      .then(updatedReaction => {
        let index = reactions.findIndex(reaction => reaction.id === updatedReaction.id);
        reactions.splice(index, 1, updatedReaction);
        reactions = reactions.slice();
        controls.changed();
      });
  };

  return (_, r) =>
    !reactions
      ? r.el('p').text('Loading...').endEl()
      : r.cmp(reactionsTable, { reactions, advanced: { toggleDisable: toggleDisableHandler } });
});
