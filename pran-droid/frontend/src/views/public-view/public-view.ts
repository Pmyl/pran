import { inlineComponent} from 'pran-gular-frontend';
import { retryFetch } from '../../helpers/retry-fetch';
import { reactionsTable } from './components/table';
import { getReactions } from './helpers/get-reactions';
import { PranDroidReactionDefinitions} from './models';
import './public-view.css';

export const publicView = inlineComponent(controls => {
  controls.setup("public-view", "public-view");
  controls.setComplexRendering();

  let reactions: PranDroidReactionDefinitions;

  (async () => {
    reactions = await getReactions();
    reactions = reactions.filter(reaction => !reaction.isDisabled);
    controls.changed();
  })();

  return (_, r) =>
    !reactions
      ? r.el('p').text('Loading...').endEl()
      : (() => {
        r.el('div', 'public-view_container');
          r.el('h1', 'public-view_title').text('Prandroid Reactions').endEl();
          r.el('div', 'public-view_table-container');
            r.cmp(reactionsTable, { reactions });
          r.endEl();
        r.endEl();
      })();
});
