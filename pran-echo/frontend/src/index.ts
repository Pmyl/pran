import './index.css';
import 'pran-animation-editor-frontend/index.css';
import { Container, createAnimationEditor, Modal } from 'pran-animation-editor-frontend';
import { createEchoPanel } from './components/echo-panel/echo-panel';

document.addEventListener('DOMContentLoaded', async () => {
  const body: Container = Container.CreateBody();
  Modal.init(body);
  const echoPanel = createEchoPanel();
  body.append(createAnimationEditor({ customPanel: echoPanel }));

  body.render();
});
