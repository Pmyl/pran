import './index.css';
import { Container, createAnimationEditor, Modal } from 'pran-animation-editor-frontend';
import { createEchoPanel } from './components/echo-panel/echo-panel';

console.log('v1.0.1');

document.addEventListener('DOMContentLoaded', async () => {
  const body: Container = Container.CreateBody();
  Modal.init(body);
  const echoPanel = createEchoPanel();
  body.append(createAnimationEditor({ customPanel: echoPanel }));

  body.render();
});
