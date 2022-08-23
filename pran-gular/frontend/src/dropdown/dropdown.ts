import { inlineComponent } from "../components/inline-component";
import { onClick, onClickInverse } from "../events/on-click";
import './dropdown.css';

interface DropdownButton {
  id: string;
  text: string;
}

export interface DropdownInputs {
  buttons: DropdownButton[];
  onSelect: (id: string) => void;
  position?: 'Bottom' | 'Top';
}

export const dropdown = inlineComponent<DropdownInputs, { show: boolean, element: HTMLElement }>(controls => {
  controls.setup('dropdown', 'dropdown');
  controls.setComplexRendering();

  let show: boolean = false,
    unsubscribeDocumentListener: (() => void) | null = null,
    element: HTMLElement;

  controls.onDestroy = () => {
    unsubscribeDocumentListener?.();
  };

  controls.onSideInputChange = {
    element: e => element = e,
    show: s => {
      show = s;
      unsubscribeDocumentListener?.();

      if (show) {
        unsubscribeDocumentListener = onClickInverse(element, '.dropdown-item-button', _ => {
          controls.setSideInput('show', false);
          console.log('asd');
        })
      }

      controls.changed();
    }
  };

  return (inputs, r) => {
    controls.mandatoryInput('buttons') && controls.mandatoryInput('onSelect');
    r.el('div', 'dropdown-container');
      r.el('button', 'button dropdown-button');
        r.attr('type', 'button');
        inputs.buttons.length === 0 && r.attr('disabled', 'disabled');
        r.text('Rewards');
      r.endEl();
      r.el('div', `dropdown-buttons-container${show ? ' dropdown-show' : ''}${inputs?.position === 'Top' ? ' dropdown-top' : ''}`);
        inputs.buttons.forEach(button => {
          r.el('button', 'button dropdown-item-button')
            .attr('type', 'button')
            .attr('data-dropdown-index', button.id)
            .text(button.text)
          .endEl();
        });
      r.endEl();
    r.endEl();

    return e => (
      controls.setSideInput('element', e),
      onClick(e, '.dropdown-item-button', ev => (controls.setSideInput('show', false), inputs.onSelect(ev.target.getAttribute('data-dropdown-index')))),
      onClick(e, '.dropdown-button', ev => (controls.setSideInput('show', !show), ev.stopPropagation()))
    );
  };
});