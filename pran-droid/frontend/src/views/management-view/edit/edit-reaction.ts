import { inlineComponent } from 'pran-gular-frontend';
import { authorize } from '../../../helpers/is-authorized';
import { trigger } from '../../public-view/components/trigger';
import { PranDroidReactionDefinition } from '../../public-view/models';
import './edit-reaction.css';

type PranDroidReactionDefinitionFormModel = Omit<PranDroidReactionDefinition, 'id'> & {
  id?: PranDroidReactionDefinition['id']
};

export const editReaction = inlineComponent<{ reaction: PranDroidReactionDefinition }>(controls => {
  authorize();
  controls.setup("edit-reaction", "edit-reaction");
  controls.setComplexRendering();

  let reaction: PranDroidReactionDefinitionFormModel = {
    count: 0,
    isDisabled: false,
    steps: [],
    triggers: []
  };

  controls.onInputChange = {
    reaction: r => reaction = r
  };

  return (_, r) => {
    r.el('div', 'edit-reaction_container');
      r.el('h2', 'edit-reaction_title').text('Edit reaction').endEl();
      reaction.triggers.forEach(t => r.cmp(trigger, { trigger: t }));
    r.endEl();
  };
});
