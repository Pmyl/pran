import './index.css';
import { Container, inlineComponent } from 'pran-gular-frontend';

const baseCmp = inlineComponent((controls) => {
  controls.setup('base-cmp');

  return () => `
    <span>It works</span>
  `;
});

document.addEventListener('DOMContentLoaded', async () => {
  const body: Container = Container.CreateBody();
  const canvas: Container = Container.CreateEmptyElement('canvas');
  (canvas.componentElement as HTMLCanvasElement).width = 500;
  (canvas.componentElement as HTMLCanvasElement).height = 500;
  body.append(baseCmp());

  body.render();
});
