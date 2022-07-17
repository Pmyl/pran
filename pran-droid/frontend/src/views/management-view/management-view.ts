import { inlineComponent, Modal } from 'pran-gular-frontend';
import { authorize } from '../../helpers/is-authorized';
import { retryFetch } from '../../helpers/retry-fetch';
import { reactionsTable } from '../public-view/components/table';
import { PranDroidReactionDefinitions } from '../public-view/models';
import './management-view.css';
import { editReactionModal } from './edit/edit-reaction-modal';

export const managementView = inlineComponent(controls => {
  authorize();
  controls.setup("management-view", "management-view");
  controls.setComplexRendering();

  let reactions: PranDroidReactionDefinitions;

  (async () => {
    reactions = (await retryFetch("/api/reactions").then(r => r.json())).data;
    controls.changed();
  })();

  const reloadReaction = async reactionId => {
    let reaction = (await retryFetch(`/api/reactions/${reactionId}`).then(r => r.json()));
    replaceReactionInList(reaction);
    controls.changed();
  };

  function replaceReactionInList(updatedReaction) {
    let index = reactions.findIndex(reaction => reaction.id === updatedReaction.id);
    reactions.splice(index, 1, updatedReaction);
    reactions = reactions.slice();
  }

  const toggleDisableHandler = reactionId => {
    const reaction = reactions.find(reaction => reaction.id === reactionId);
    retryFetch(`/api/reactions/${reaction.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDisabled: !reaction.isDisabled })
    }).then(response => response.json())
      .then(updatedReaction => {
        replaceReactionInList(updatedReaction);
        controls.changed();
      });
  };

  const editHandler = reactionId => {
    const reaction = reactions.find(reaction => reaction.id === reactionId);
    Modal.open(editReactionModal({ reaction })).then(() => {
      reloadReaction(reactionId);
    });
  };

  return (_, r) =>
    !reactions
      ? r.el('p').text('Loading...').endEl()
      : (() => {
        r.el('div', 'management-view_container');
          r.el('h1', 'management-view_title').text('Prandroid Reactions').endEl();
          r.el('h6', 'management-view_subtitle').text('Management app').endEl();

          r.el('div', 'public-view_table-container');
            r.cmp(reactionsTable, { reactions, advanced: { toggleDisable: toggleDisableHandler, edit: editHandler } });
          r.endEl();
        r.endEl();
      })();
});
