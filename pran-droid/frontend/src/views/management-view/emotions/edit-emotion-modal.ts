import { ComplexRenderer, Container, inlineComponent, ModalContentInputs, onChange, onClick } from 'pran-gular-frontend';
import { EmotionApiAnimationLayerModel, EmotionApiLayerModel, EmotionApiModel } from '../../../api-interface/emotions';
import { emotionToPranDroidEmotion } from '../../../brain-connection/response-parsers';
import { PranDroid } from '../../../droid/droid';
import { PranDroidBuilder } from '../../../droid/droid-builder';
import { SpeechBubble } from '../../../speech-bubble/speech-bubble';
import './edit-emotion-modal.css';

interface EmotionLayerModelNode {
  layer: EmotionApiLayerModel;
  children: EmotionLayerModelNode[];
}

interface EmotionModel {
  id: string;
  name: string;
  layerNodes: EmotionLayerModelNode[];
}

export const editEmotionModal = inlineComponent<ModalContentInputs<void> & { emotion: EmotionApiModel }>(controls => {
  controls.setup('edit-emotion-modal', 'edit-emotion-modal');
  controls.setComplexRendering();

  let emotionModel: EmotionModel;
  let layersMap: Map<string, EmotionLayerModelNode>;

  const pranCanvas: Container = Container.CreateEmptyElement('canvas');
  (pranCanvas.componentElement as HTMLCanvasElement).width = 500;
  (pranCanvas.componentElement as HTMLCanvasElement).height = 500;
  pranCanvas.componentElement.style.width = '500px';
  pranCanvas.componentElement.style.height = '500px';
  const speechBubbleCanvas: Container = Container.CreateEmptyElement('canvas');
  let pranDroid: PranDroid;

  controls.onInputChange = {
    emotion: e => {
      emotionModel = {
        id: e.id,
        name: e.name,
        layerNodes: []
      };

      layersMap = new Map<string, EmotionLayerModelNode>();

      e.layers.forEach(layer => {
        const layerNode = { layer: layer, children: [] };
        if (layer.parentId && layersMap.has(layer.parentId)) {
          layersMap.get(layer.parentId).children.push(layerNode);
        } else {
          emotionModel.layerNodes.push(layerNode);
        }

        layersMap.set(layer.id, layerNode);
      });

      (async () => {
        const speechBubble = await SpeechBubble.create(speechBubbleCanvas.componentElement as HTMLCanvasElement);
        pranDroid = await PranDroidBuilder.create(pranCanvas, speechBubble)
          .useApiImages()
          .useCustomEmotions([emotionToPranDroidEmotion(e)])
          .build();
        pranDroid.start();
      })();
    }
  };

  // TODO: on change of emotion call pranDroid.setIdle(emotionToPranDroidEmotion(emotion).asIdleAnimation())
  // so that the preview updates live
  // TODO: figure out how to create the most "zoomed in" canvas possible to use for preview

  function drawEmotionLayer(r: ComplexRenderer, layerNode: EmotionLayerModelNode) {
    r.div('edit-emotion-modal_emotion-row');
      r.div('edit-emotion-modal_emotion-row-content');
        r.div().text(layerNode.layer.type).endEl();
        if (layerNode.layer.type === 'Mouth') {
          r.div().text(JSON.stringify(layerNode.layer.mouthMapping)).endEl();
        } else {
          layerNode.layer.frames.forEach((frame, index) => {
            r.div();
              r.el('input').attr('id', `layer-${layerNode.layer.id}-${index}-frame-start`).endEl();
              r.el('input').attr('id', `layer-${layerNode.layer.id}-${index}-frame-end`).endEl();
              r.el('input').attr('id', `layer-${layerNode.layer.id}-${index}-image-id`).endEl();
            r.endEl();
          });
        }
      r.endEl();
      r.div('edit-emotion-modal_emotion-row-children-container');
        layerNode.children.forEach(childNode => {
          drawEmotionLayer(r, childNode);
        });
      r.endEl();
    r.endEl();
  }

  function rebuildEmotionPreview() {
    const layers = [];
    layersMap.forEach(l => {
      layers.push(l.layer);
    });
    const emotionApi = {
      id: emotionModel.id,
      name: emotionModel.name,
      layers: layers.sort((a, b) => a.id !== b.parentId ? 1 : -1)
    };
    pranDroid.setIdle(emotionToPranDroidEmotion(emotionApi).asIdleAnimation());
    pranDroid.start();
    controls.changed();
  }

  function setInputValue(container: HTMLElement, query: string, value: string) {
    (container.querySelector(query) as HTMLInputElement).value = value;
  }

  return (i, r) => {
    r.div();
      emotionModel.layerNodes.forEach(node => drawEmotionLayer(r, node));
    r.endEl();
    r.cmpi(pranCanvas).cmpi(speechBubbleCanvas);

    return e => (
      layersMap.forEach(layerNode => {
        if (layerNode.layer.type === 'Animation') {
          layerNode.layer.frames.forEach((frame, index) => {
            setInputValue(e, `#layer-${layerNode.layer.id}-${index}-frame-start`, frame.frameStart.toString());
            onChange(e, `#layer-${layerNode.layer.id}-${index}-frame-start`, t => (t.target.value !== '' && (frame.frameStart = parseInt(t.target.value), rebuildEmotionPreview())))
            setInputValue(e, `#layer-${layerNode.layer.id}-${index}-frame-end`, frame.frameEnd.toString());
            onChange(e, `#layer-${layerNode.layer.id}-${index}-frame-end`, t => (t.target.value !== '' && (frame.frameEnd = parseInt(t.target.value), rebuildEmotionPreview())))
            setInputValue(e, `#layer-${layerNode.layer.id}-${index}-image-id`, frame.imageId);
            onChange(e, `#layer-${layerNode.layer.id}-${index}-image-id`, t => (t.target.value !== '' && (frame.imageId = t.target.value, rebuildEmotionPreview())))
          });
        }
      })
    );
  };
});
