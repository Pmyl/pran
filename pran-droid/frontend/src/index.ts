import { Container } from 'pran-gular-frontend';
import { droidView } from './views/droid-view/droid-view';
import { managementView } from './views/management-view/management-view';
import { publicView } from './views/public-view/public-view';
import './index.css';

document.addEventListener('DOMContentLoaded', () => {
  const route = window.location.pathname;

  switch (route) {
    case '/':
      renderPrangular(publicView);
      break;
    case '/droid':
      renderPrangular(droidView);
      break;
    case '/management':
      renderPrangular(managementView);
      break;
    default:
      window.location.href = '/';
  }
});

const renderPrangular = cmp => Container.CreateBody().append(cmp()).render();
