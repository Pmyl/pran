import { Container } from 'pran-gular-frontend';
import './index.css';
import { droidView } from './views/droid-view/droid-view';
import { publicView } from './views/public-view/public-view';

document.addEventListener('DOMContentLoaded', async() => {
  const body: Container = Container.CreateBody();

  let route = window.location.pathname;

  switch (route) {
    case '/':
      body.append(publicView());
      break;
    case '/droid':
      body.append(droidView());
      break;
    default:
      window.location.href = '/';
  }
  body.render();
});
