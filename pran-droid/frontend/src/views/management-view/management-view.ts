import { inlineComponent, Modal, onClick } from 'pran-gular-frontend';
import { authorize } from '../../helpers/is-authorized';
import { retryFetch } from '../../helpers/retry-fetch';
import { reactionsTable } from '../public-view/components/table';
import { getReaction, getReactions } from '../public-view/helpers/get-reactions';
import { PranDroidReactionDefinitions } from '../public-view/models';
import './management-view.css';
import { editReactionModal } from './edit/edit-reaction-modal';
import { previewModal } from './preview/preview-modal';

export const managementView = inlineComponent(controls => {
  authorize();
  controls.setup("management-view", "management-view");
  controls.setComplexRendering();

  let reactions: PranDroidReactionDefinitions;

  (async () => {
    await loadReactions();
    controls.changed();
  })();

  function loadReactions() {
    return getReactions().then(r => reactions = r);
  }

  const reloadReaction = async reactionId => {
    let reaction = await getReaction(reactionId);
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

  const editReaction = reactionId => {
    const reaction = reactions.find(reaction => reaction.id === reactionId);
    Modal.open(editReactionModal({ reaction })).then(() => {
      reloadReaction(reactionId);
    });
  };

  const createReaction = () => {
    Modal.open(editReactionModal()).then(loadReactions).then(controls.changed);
  };

  const openPreviewModal = () => {
    Modal.open(previewModal({ reactions: reactions || [] }));
  };

  return (_, r) => {
    !reactions
      ? r.el('p').text('Loading...').endEl()
      : (() => {
        r.el('div', 'management-view_container');
          r.el('div', 'management-view_title-container');
            r.el('h1', 'management-view_title').text('Prandroid Reactions').endEl();
            r.el('button', 'button management-view_preview-button').attr('type', 'button');
              r.el('img').attr('src', './resources/preview-icon.png').endEl();
            r.endEl();
          r.endEl();
          r.el('h6', 'management-view_subtitle').text('Management app').endEl();
          r.el('div', 'management-view_create-new-container');
            r.el('button', 'button button-positive-alt management-view_create-new-button').attr('type', 'button').text('+').endEl();
          r.endEl();

          r.el('div', 'public-view_table-container');
            r.cmp(reactionsTable, { reactions, advanced: { toggleDisable: toggleDisableHandler, edit: editReaction } });
          r.endEl();
        r.endEl();
      })();

    return e => (
      onClick(e, '.management-view_create-new-button', () => createReaction()),
      onClick(e, '.management-view_preview-button', () => openPreviewModal())
    );
  };
});
