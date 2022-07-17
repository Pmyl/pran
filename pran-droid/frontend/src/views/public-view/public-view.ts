import { inlineComponent} from 'pran-gular-frontend';
import { retryFetch } from '../../helpers/retry-fetch';
import { reactionsTable } from './components/table';
import { PranDroidReactionDefinitions} from './models';
import './public-view.css';

export const publicView = inlineComponent(controls => {
  controls.setup("public-view", "public-view");
  controls.setComplexRendering();

  let reactions: PranDroidReactionDefinitions;

  (async () => {
    reactions = (await retryFetch("/api/reactions").then(r => r.json())).data;
    reactions = reactions.filter(reaction => !reaction.isDisabled);
    controls.changed();
  })();

  return (_, r) =>
    !reactions
      ? r.el('p').text('Loading...').endEl()
      : r.cmp(reactionsTable, { reactions });
});
