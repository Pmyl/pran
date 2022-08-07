import './index.css';
import { Container, Modal } from 'pran-gular-frontend';
import { droidView } from './views/droid-view/droid-view';
import { managementView } from './views/management-view/management-view';
import { publicView } from './views/public-view/public-view';

document.addEventListener('DOMContentLoaded', () => {
  const route = window.location.pathname;
  const body = Container.CreateBody();
  Modal.init(body);

  switch (route) {
    case '/':
      body.append(publicView()).render();
      break;
    case '/droid':
      body.append(droidView()).render();
      break;
    case '/management':
      body.append(managementView()).render();
      break;
    default:
      window.location.href = '/';
  }
});
