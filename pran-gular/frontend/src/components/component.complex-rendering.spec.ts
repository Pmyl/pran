import { createComplexRendererFixture } from '../../testing/complex-renderer-fixture';
import { createTestComponent } from '../../testing/test-component';
import '../../testing/mock-dom';

describe('Component Complex Rendering', () => {
  describe('when is the first render', () => {
    describe('when creating a new element', () => {
      it('should add the element to the host element', () => {
        const fixture = createComplexRendererFixture();
        fixture.render(r => r.el('div').endEl());

        expect(fixture.hostElement.children.length).toBe(1);
        expect(fixture.hostElement.children[0].tagName).toBe('DIV');
      });

      it('should apply the provided class to the created element', () => {
        let fixture = createComplexRendererFixture();
        fixture.render(r => r.el('div').endEl());
        expect(fixture.hostElement.children[0].className).toBe('');

        fixture = createComplexRendererFixture();
        fixture.render(r => r.el('div', 'a class').endEl());
        expect(fixture.hostElement.children[0].className).toBe('a class');
      });

      it('should create nested elements', () => {
        const fixture = createComplexRendererFixture();
        fixture.render(r => r.el('div', 'main').el('span', 'child').endEl().endEl().endRender());

        expect(fixture.hostElement.children.length).toBe(1);
        expect(fixture.hostElement.children[0].tagName).toBe('DIV');
        expect(fixture.hostElement.children[0].className).toBe('main');

        expect(fixture.hostElement.children[0].children.length).toBe(1);
        expect(fixture.hostElement.children[0].children[0].tagName).toBe('SPAN');
        expect(fixture.hostElement.children[0].children[0].className).toBe('child');
      });

      it('should fail when there are unclosed elements', () => {
        const fixture = createComplexRendererFixture();
        expect(() => fixture.render(r =>
          r.el('div', 'main')
            .el('span', 'child')
            .endEl())).toThrow();
      });
    });

    describe('when creating a component', () => {
      it('should create and render one instance inside the current element', () => {
        const testComponent = createTestComponent();
        const fixture = createComplexRendererFixture();

        fixture.render(r => r.el('div').cmp(testComponent.component, {}).endEl());

        expect(fixture.hostElement.children[0].children.length).toBe(1);
        expect(fixture.hostElement.children[0].children[0].tagName).toBe('TEST-COMPONENT');
        expect(testComponent.instances.length).withContext('Only one instance created').toBe(1);
        expect(testComponent.instances[0].isDestroyed).withContext('Not destroyed').toBe(false);
        expect(testComponent.instances[0].inputChanges).withContext('Inputs provided only once').toBe(1);
        expect(testComponent.instances[0].renders).withContext('Only one rendering').toBe(1);
      });
    });

    describe('when adding text to an element', () => {
      it('should set the text node in the current element', () => {
        const fixture = createComplexRendererFixture();

        fixture.render(r => r.el('div').el('span').text('child').endEl().endEl());

        expect((fixture.hostElement.children[0].children[0] as HTMLElement).innerText).toBe('child');
      });

      it('should override any other content in the current element', () => {
        const fixture = createComplexRendererFixture();

        fixture.render(r => r.el('div').el('span').endEl().text('parent').endEl());

        expect(fixture.hostElement.children.length).toBe(1);
        expect((fixture.hostElement.children[0] as HTMLElement).innerText).toBe('parent');
      });
    });

    describe('when adding html to an element', () => {
      it('should set the html content in the current element', () => {
        const fixture = createComplexRendererFixture();

        fixture.render(r => r.el('div').el('span').html('<child>child span</child>').endEl().endEl());

        expect(fixture.hostElement.children[0].children[0].children.length).toBe(1);
        expect(fixture.hostElement.children[0].children[0].children[0].tagName).toBe('CHILD');
        expect(fixture.hostElement.children[0].children[0].children[0].textContent).toBe('child span');
      });

      it('should override any other content in the current element', () => {
        const fixture = createComplexRendererFixture();

        fixture.render(r => r.el('div').el('span').endEl().html('<child>child span</child>').endEl());

        expect(fixture.hostElement.children[0].children.length).toBe(1);
        expect(fixture.hostElement.children[0].children[0].tagName).toBe('CHILD');
        expect(fixture.hostElement.children[0].children[0].textContent).toBe('child span');
      });
    });

    describe('when setting an attribute to an element', () => {
      it('should set the attribute in the current element', () => {
        const fixture = createComplexRendererFixture();

        fixture.render(r => r.el('div')
          .attr('parent-attr', 'parent')
          .el('span')
          .attr('child-attr', 'child')
          .endEl()
          .attr('parent-attr2', 'parent2')
          .endEl());

        expect(fixture.hostElement.children[0].getAttribute('parent-attr')).toBe('parent');
        expect(fixture.hostElement.children[0].getAttribute('parent-attr2')).toBe('parent2');
        expect(fixture.hostElement.children[0].children[0].getAttribute('child-attr')).toBe('child');
      });
    });

    describe('when having a complex rendering with multiple layers of elements', () => {
      it('should correctly render keeping track of the current element', () => {
        const fixture = createComplexRendererFixture();

        fixture.render(r => r.el('grandparent')
          .attr('grandparent-attr', 'grandparent')
          .el('parent')
            .attr('parent-attr', 'child')
            .el('child-1').endEl()
            .el('child-2')
              .attr('child-2-attr', 'child-2-value')
              .text('child 2 text')
            .endEl()
          .endEl()
          .endEl());

        expect(fixture.hostElement.children[0].tagName).toBe('GRANDPARENT');
        expect(fixture.hostElement.children[0].getAttribute('grandparent-attr')).toBe('grandparent');
        expect(fixture.hostElement.children[0].children.length).toBe(1);

        expect(fixture.hostElement.children[0].children[0].tagName).toBe('PARENT');
        expect(fixture.hostElement.children[0].children[0].children.length).toBe(2);

        expect(fixture.hostElement.children[0].children[0].children[0].tagName).toBe('CHILD-1');
        expect(fixture.hostElement.children[0].children[0].children[0].children.length).withContext('child 1 has no children').toBe(0);
        expect((fixture.hostElement.children[0].children[0].children[0] as HTMLElement).innerText).toBe(undefined);

        expect(fixture.hostElement.children[0].children[0].children[1].tagName).toBe('CHILD-2');
        expect(fixture.hostElement.children[0].children[0].children[1].children.length).withContext('child 2 has no children').toBe(0);
        expect((fixture.hostElement.children[0].children[0].children[1] as HTMLElement).innerText).toBe('child 2 text');
        expect(fixture.hostElement.children[0].children[0].children[1].getAttribute('child-2-attr')).toBe('child-2-value');
      });
    });
  });

  describe('when changing render content', () => {
    // Elements
    describe('Root -> 1 Element when adding a new element in Root', () => {
      it('should not destroy the first element', () => {
        const fixture = createComplexRendererFixture();

        fixture.render(r => r.el('div').endEl());
        const elementInRoot = fixture.hostElement.children[0];
        fixture.render(r => r.el('div').endEl().el('span').endEl());

        expect(fixture.hostElement.children[0]).toBe(elementInRoot);
      });

      it('should render correctly two elements', () => {
        const fixture = createComplexRendererFixture();

        fixture.render(r => r.el('div').endEl());
        fixture.render(r => r.el('div').endEl().el('span').endEl());

        expect(fixture.hostElement.children[1].tagName).toBe('SPAN');
      });
    });

    describe('Root -> 2 Elements when inserting a new element between two existing', () => {
      it('should not destroy the existing elements', () => {
        const fixture = createComplexRendererFixture();

        fixture.render(r => r.el('div').endEl().el('span').endEl());
        const element1InRoot = fixture.hostElement.children[0];
        const element2InRoot = fixture.hostElement.children[1];
        fixture.render(r => r.el('div').endEl().el('p').endEl().el('span').endEl());

        expect(fixture.hostElement.children[0]).toBe(element1InRoot);
        expect(fixture.hostElement.children[2]).toBe(element2InRoot);
      });
    });

    describe('Root -> 2 Elements when removing the second element', () => {
      it('should not destroy the first element and have only one element left', () => {
        const fixture = createComplexRendererFixture();

        fixture.render(r => r.el('div').endEl().el('span').endEl());
        const element1InRoot = fixture.hostElement.children[0];
        fixture.render(r => r.el('div').endEl());

        expect(fixture.hostElement.children.length).toBe(1);
        expect(fixture.hostElement.children[0]).toBe(element1InRoot);
      });
    });

    describe('Root -> 3 Elements when adding an element at index 1', () => {
      it('should render the correct elements', () => {
        const fixture = createComplexRendererFixture();

        fixture.render(r => r
          .scel('first')
          .scel('second')
          .scel('third')
          .scel('fourth'));
        fixture.render(r => r
          .scel('first')
          .scel('intruder')
          .scel('second')
          .scel('third')
          .scel('fourth'));

        expect(fixture.hostElement.children.length).toBe(5);
        expect(fixture.hostElement.children[0].tagName).toBe('FIRST');
        expect(fixture.hostElement.children[1].tagName).toBe('INTRUDER');
        expect(fixture.hostElement.children[2].tagName).toBe('SECOND');
        expect(fixture.hostElement.children[3].tagName).toBe('THIRD');
        expect(fixture.hostElement.children[4].tagName).toBe('FOURTH');
      });
    });

    describe('Root -> 2 Elements when removing the first element', () => {
      it('should have only one element left', () => {
        const fixture = createComplexRendererFixture();

        fixture.render(r => r.el('div').el('div').endEl().el('span').endEl().endEl());
        fixture.render(r => r.el('div').el('span').endEl().endEl());

        expect(fixture.hostElement.children[0].children.length).toBe(1);
      });
    });

    describe('Root -> 2 Element with Element 0 -> Button and Element 1 is a Button when duplicating Element 0', () => {
      it('should render the correct elements', () => {
        const fixture = createComplexRendererFixture();

        fixture.render(r => r
          .div()
            .button().endEl()
          .endEl()
          .button().endEl());
        fixture.render(r => r
          .div()
            .button().endEl()
          .endEl()
          .div()
            .button().endEl()
          .endEl()
          .button().endEl());

        expect(fixture.hostElement.children.length).toBe(3);
        expect(fixture.hostElement.children[0].tagName).toBe('DIV')
        expect(fixture.hostElement.children[0].children.length).toBe(1)
        expect(fixture.hostElement.children[0].children[0].tagName).toBe('BUTTON');

        expect(fixture.hostElement.children[1].tagName).toBe('DIV')
        expect(fixture.hostElement.children[1].children.length).toBe(1)
        expect(fixture.hostElement.children[1].children[0].tagName).toBe('BUTTON');

        expect(fixture.hostElement.children[2].tagName).toBe('BUTTON');
      });
    });

    // Components
    describe('Root -> 1 Component when adding a new component in Root', () => {
      it('should not destroy the first component', () => {
        const fixture = createComplexRendererFixture();
        const testComponent1 = createTestComponent();
        const testComponent2 = createTestComponent();

        fixture.render(r => r.cmp(testComponent1.component));
        const elementInRoot = fixture.hostElement.children[0];
        fixture.render(r => r.cmp(testComponent1.component).cmp(testComponent2.component));

        expect(fixture.hostElement.children[0]).toBe(elementInRoot);
        expect(testComponent1.instances.length).toBe(1);
      });

      it('should render correctly two component', () => {
        const fixture = createComplexRendererFixture();
        const testComponent1 = createTestComponent();
        const testComponent2 = createTestComponent();

        fixture.render(r => r.cmp(testComponent1.component));
        fixture.render(r => r.cmp(testComponent1.component).cmp(testComponent2.component));

        expect(fixture.hostElement.children[0].tagName).toBe('TEST-COMPONENT');
        expect(fixture.hostElement.children[1].tagName).toBe('TEST-COMPONENT');
        expect(testComponent1.instances.length).toBe(1);
        expect(testComponent2.instances.length).toBe(1);
      });
    });

    describe('Root -> 2 Components when inserting a new component between two existing', () => {
      it('should not destroy the existing components', () => {
        const fixture = createComplexRendererFixture();
        const testComponent1 = createTestComponent();
        const testComponent2 = createTestComponent();
        const testComponent3 = createTestComponent();

        fixture.render(r => r.cmp(testComponent1.component).cmp(testComponent2.component));
        const element1InRoot = fixture.hostElement.children[0];
        const element2InRoot = fixture.hostElement.children[1];
        fixture.render(r => r.cmp(testComponent1.component).cmp(testComponent3.component).cmp(testComponent2.component));

        expect(fixture.hostElement.children[0]).toBe(element1InRoot);
        expect(fixture.hostElement.children[2]).toBe(element2InRoot);
        expect(testComponent1.instances.length).toBe(1);
        expect(testComponent2.instances.length).toBe(1);
        expect(testComponent3.instances.length).toBe(1);
      });
    });

    describe('Root -> 2 Components when removing the second component', () => {
      it('should not destroy the first component and have only one component left', () => {
        const fixture = createComplexRendererFixture();
        const testComponent1 = createTestComponent();
        const testComponent2 = createTestComponent();

        fixture.render(r => r.cmp(testComponent1.component).cmp(testComponent2.component));
        const element1InRoot = fixture.hostElement.children[0];
        fixture.render(r => r.cmp(testComponent1.component));

        expect(fixture.hostElement.children.length).toBe(1);
        expect(fixture.hostElement.children[0]).toBe(element1InRoot);
        expect(testComponent1.instances.length).toBe(1);
        expect(testComponent2.instances.length).toBe(1);
        expect(testComponent2.instances[0].isDestroyed).toBe(true);
      });
    });

    describe('Root -> Element -> 1 Component when moving it', () => {
      it('should not destroy the component reusing the same instance in the new place', () => {
        const fixture = createComplexRendererFixture();
        const testComponent = createTestComponent();

        fixture.render(r => r.el('p').cmp(testComponent.component).endEl());
        const componentElement = fixture.hostElement.children[0].children[0];
        fixture.render(r => r.el('div').el('span').cmp(testComponent.component).endEl().endEl());

        expect(testComponent.instances.length).toBe(1);
        expect(componentElement).toBe(fixture.hostElement.children[0].children[0].children[0]);
      });
    });

    describe('Root -> Element -> 1 Component when moving it with different inputs', () => {
      it('should pass the new inputs to the component', () => {
        const fixture = createComplexRendererFixture();
        const testComponent = createTestComponent();

        fixture.render(r => r.el('p').cmp(testComponent.component, { test: 1 }).endEl());
        fixture.render(r => r.el('div').el('span').cmp(testComponent.component, { test: 2, input: 3 }).endEl().endEl());

        expect(testComponent.instances.length).toBe(1);
        expect(testComponent.instances[0].inputChanges).toBe(2);
        expect(testComponent.instances[0].inputs).toEqual({ test: 2, input: 3 });
      });
    });

    describe('Root -> 4 Elements when adding a component at index 1', () => {
      it('should render the correct elements', () => {
        const fixture = createComplexRendererFixture();
        const testComponent = createTestComponent();

        fixture.render(r => r
          .scel('first')
          .scel('second')
          .scel('third')
          .scel('fourth'));
        fixture.render(r => r
          .scel('first')
          .cmp(testComponent.component)
          .scel('second')
          .scel('third')
          .scel('fourth'));

        expect(fixture.hostElement.children.length).toBe(5);
        expect(fixture.hostElement.children[0].tagName).toBe('FIRST');
        expect(fixture.hostElement.children[1].tagName).toBe('TEST-COMPONENT');
        expect(fixture.hostElement.children[2].tagName).toBe('SECOND');
        expect(fixture.hostElement.children[3].tagName).toBe('THIRD');
        expect(fixture.hostElement.children[4].tagName).toBe('FOURTH');
        expect(testComponent.instances.length).toBe(1);
        expect(testComponent.instances[0].renders).toBe(1);
      });
    });

    describe('Root -> 2 Elements -> 2 Child Elements [at index 0 -> Component]/[at index 1 -> Element with same tag as Root -> Element at index 1] when adding another Child Element -> Component', () => {
      it('should render the correct elements', () => {
        const fixture = createComplexRendererFixture();
        const testComponent = createTestComponent();

        fixture.render(r => r
          .el('container')
            .el('first')
              .cmp(testComponent.component)
            .endEl()
            .scel('same-tag')
          .endEl()
          .el('same-tag')
          .endEl());
        fixture.render(r => r
          .el('container')
            .el('first')
              .cmp(testComponent.component)
            .endEl()
            .el('first')
              .cmp(testComponent.component)
            .endEl()
            .scel('same-tag')
          .endEl()
          .el('same-tag')
          .endEl());

        expect(fixture.hostElement.children.length).toBe(2);
        expect(fixture.hostElement.children[0].tagName).toBe('CONTAINER');
        expect(fixture.hostElement.children[0].children.length).toBe(3);
        expect(fixture.hostElement.children[0].children[0].tagName).toBe('FIRST');
        expect(fixture.hostElement.children[0].children[0].children.length).toBe(1);
        expect(fixture.hostElement.children[0].children[0].children[0].tagName).toBe('TEST-COMPONENT');
        expect(fixture.hostElement.children[0].children[1].tagName).toBe('FIRST');
        expect(fixture.hostElement.children[0].children[1].children.length).toBe(1);
        expect(fixture.hostElement.children[0].children[1].children[0].tagName).toBe('TEST-COMPONENT');
        expect(fixture.hostElement.children[0].children[2].tagName).toBe('SAME-TAG');
        expect(fixture.hostElement.children[1].tagName).toBe('SAME-TAG');
        expect(testComponent.instances.length).toBe(2);
        expect(testComponent.instances[0].renders).toBe(1);
        expect(testComponent.instances[1].renders).toBe(1);
      });
    });

    describe('Root -> 2 Elements when adding a component between the elements and another after the second element', () => {
      it('should render the correct elements', () => {
        const fixture = createComplexRendererFixture();
        const testComponent = createTestComponent();

        fixture.render(r => r
          .scel('first')
          .scel('second'));
        fixture.render(r => r
          .scel('first')
          .cmp(testComponent.component)
          .scel('second')
          .cmp(testComponent.component));

        expect(fixture.hostElement.children.length).toBe(4);
        expect(fixture.hostElement.children[0].tagName).toBe('FIRST')
        expect(fixture.hostElement.children[1].tagName).toBe('TEST-COMPONENT')
        expect(fixture.hostElement.children[2].tagName).toBe('SECOND')
        expect(fixture.hostElement.children[3].tagName).toBe('TEST-COMPONENT')
        expect(testComponent.instances.length).toBe(2);
        expect(testComponent.instances[0].renders).toBe(1);
        expect(testComponent.instances[1].renders).toBe(1);
      });
    });

    // Attributes
    describe('Root -> 1 Element without attribute when adding an attribute', () => {
      it('should keep the same element', () => {
        const fixture = createComplexRendererFixture();

        fixture.render(r => r.el('div').endEl());
        const elementInRoot = fixture.hostElement.children[0];
        fixture.render(r => r.el('div').attr('hidden', 'false').endEl());

        expect(fixture.hostElement.children[0]).toBe(elementInRoot);
      });

      it('should add the new attribute', () => {
        const fixture = createComplexRendererFixture();

        fixture.render(r => r.el('div').endEl());
        fixture.render(r => r.el('div').attr('hidden', 'false').endEl());

        expect(fixture.hostElement.children[0].attributes.getNamedItem('hidden').value).toBe('false');
      });
    });

    describe('Root -> 1 Element with attribute when adding an attribute', () => {
      it('should keep the same element', () => {
        const fixture = createComplexRendererFixture();

        fixture.render(r => r.el('div').attr('disabled', 'true').endEl());
        const elementInRoot = fixture.hostElement.children[0];
        fixture.render(r => r.el('div').attr('disabled', 'true').attr('hidden', 'false').endEl());

        expect(fixture.hostElement.children[0]).toBe(elementInRoot);
      });

      it('should add the new attribute', () => {
        const fixture = createComplexRendererFixture();

        fixture.render(r => r.el('div').attr('disabled', 'true').endEl());
        fixture.render(r => r.el('div').attr('disabled', 'true').attr('hidden', 'false').endEl());

        expect(fixture.hostElement.children[0].attributes.getNamedItem('disabled').value).toBe('true');
        expect(fixture.hostElement.children[0].attributes.getNamedItem('hidden').value).toBe('false');
      });
    });

    describe('Root -> 1 Element with attribute when removing an attribute', () => {
      it('should keep the same element', () => {
        const fixture = createComplexRendererFixture();

        fixture.render(r => r.el('div').attr('disabled', 'true').endEl());
        const elementInRoot = fixture.hostElement.children[0];
        fixture.render(r => r.el('div').endEl());

        expect(fixture.hostElement.children[0]).toBe(elementInRoot);
      });

      it('should remove the attribute', () => {
        const fixture = createComplexRendererFixture();

        fixture.render(r => r.el('div').attr('disabled', 'true').endEl());
        fixture.render(r => r.el('div').endEl());

        expect(fixture.hostElement.children[0].attributes.getNamedItem('disabled')).toBeNull();
      });
    });

    describe('Root -> 2 Elements first with attribute when removing an attribute', () => {
      it('should keep the same elements', () => {
        const fixture = createComplexRendererFixture();

        fixture.render(r => r.el('div').attr('disabled', 'true').endEl().el('span').endEl());
        const element1InRoot = fixture.hostElement.children[0];
        const element2InRoot = fixture.hostElement.children[1];
        fixture.render(r => r.el('div').endEl().el('span').endEl());

        expect(fixture.hostElement.children.length).toBe(2);
        expect(fixture.hostElement.children[0]).toBe(element1InRoot);
        expect(fixture.hostElement.children[1]).toBe(element2InRoot);
      });

      it('should remove the attribute', () => {
        const fixture = createComplexRendererFixture();

        fixture.render(r => r.el('div').attr('disabled', 'true').endEl().el('span').endEl());
        fixture.render(r => r.el('div').endEl().el('span').endEl());

        expect(fixture.hostElement.children[0].attributes.getNamedItem('disabled')).toBeNull();
      });
    });
  });
});
