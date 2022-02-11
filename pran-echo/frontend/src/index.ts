import './index.css';
import { createAnimationEditor, Modal } from 'pran-animation-editor-frontend';
import { Container } from 'pran-gular-frontend';
import { createEchoPanel } from './components/echo-panel/echo-panel';
import { MouthMapping } from './mapping/mouth-mapping';

console.log('v1.0.1');

document.addEventListener('DOMContentLoaded', async () => {
  const body: Container = Container.CreateBody();
  Modal.init(body);
  const mouthMapping = await MouthMapping.create();
  const echoPanel = createEchoPanel({ mouthMapping });
  body.append(createAnimationEditor({
    customPanel: echoPanel,
    imagesMap: mouthMapping.getImageMap().concat([
      ['head_idle', './resources/idle_0000.png'],
      ['eyes_open', './resources/eyes/eyes_0000.png'],
      ['eyes_semi_open', './resources/eyes/eyes_0001.png'],
      ['eyes_closed', './resources/eyes/eyes_0002.png'],
      ['pause', './resources/mouth/pause.png'],
      ['smile', './resources/mouth/smile.png']
    ])
  }));

  body.render();
});
