import './index.css';
import { Container } from './components/container/container';
import { createEchoPanel } from './components/echo-panel/echo-panel';
import { createPranEditor } from './components/pran-editor/pran-editor';
import { Modal } from './services/modal';

document.addEventListener('DOMContentLoaded', async () => {
  const body: Container = Container.CreateBody();
  const modalSection: Container = Container.CreateEmptyElement(body, 'section', 'modal-section');
  Modal.init(modalSection);
  const echoPanel = createEchoPanel();
  body.append(createPranEditor({ customPanel: echoPanel }));

  body.render();
});
