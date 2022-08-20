import { inlineComponent, ModalContentInputs } from 'pran-gular-frontend';
import { authorize } from '../../../helpers/is-authorized';
import { PranDroidReactionDefinition } from '../../public-view/models';
import { editReaction } from './edit-reaction';
import './edit-reaction-modal.css';

export const editReactionModal = inlineComponent<ModalContentInputs<void> & { reaction?: PranDroidReactionDefinition }>(controls => {
  authorize();
  controls.setup("edit-reaction-modal", "edit-reaction-modal");
  controls.setComplexRendering();

  return (inputs, r) =>
    r.cmp(editReaction, { reaction: inputs.reaction, onDone: inputs.close, onCancel: inputs.dismiss, interceptDismiss: inputs.interceptDismiss });
});
