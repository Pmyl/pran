import { ComplexRenderer, Container, inlineComponent, Modal, ModalContentInputs, onChange, onClick } from 'pran-gular-frontend';
import { EmotionApiAnimationLayerModel, EmotionApiLayerModel, EmotionApiModel, EmotionApiMouthLayerModel, createEmotion } from '../../../api-interface/emotions';
import { emotionToPranDroidEmotion } from '../../../brain-connection/response-parsers';
import { PranDroid } from '../../../droid/droid';
import { PranDroidBuilder } from '../../../droid/droid-builder';
import { deepClone } from '../../../helpers/deepClone';
import { SpeechBubble } from '../../../speech-bubble/speech-bubble';
import './edit-emotion-modal.css';
import { selectImageModal } from '../images/select-image-modal';

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
        const layerNode = { layer: deepClone(layer), children: [] };
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

  // TODO: figure out how to create the most "zoomed in" canvas possible to use for preview

  function drawEmotionLayer(r: ComplexRenderer, layerNode: EmotionLayerModelNode) {
    r.div('edit-emotion-modal_emotion-row');
      r.div('edit-emotion-modal_emotion-row-content');
        r.div().text(layerNode.layer.type).endEl();
        if (layerNode.layer.type === 'Mouth') {
          r.div();
            Object.keys(layerNode.layer.mouthMapping).forEach(mouthKey => {
              r.el('label').text(mouthKey).endEl();
              r.button('button').attr('id', `layer-${layerNode.layer.id}-mouth-${mouthKey}`).text((layerNode.layer as EmotionApiMouthLayerModel).mouthMapping[mouthKey]).endEl();
            });
          r.endEl();
        } else {
          layerNode.layer.frames.forEach((frame, index) => {
            r.div();
              r.el('input').attr('id', `layer-${layerNode.layer.id}-${index}-frame-start`).endEl();
              r.el('input').attr('id', `layer-${layerNode.layer.id}-${index}-frame-end`).endEl();
              r.button('button').attr('id', `layer-${layerNode.layer.id}-${index}-image-id`).text(frame.imageId).endEl();
              if ((layerNode.layer as EmotionApiAnimationLayerModel).frames.length > 1) {
                r.button('button button-danger').attr('id', `layer-${layerNode.layer.id}-${index}-delete-image-id`).text('🗑').endEl();
              }
            r.endEl();
          });
          r.button('button button-positive').attr('id', `layer-${layerNode.layer.id}-add-frame`).text('+').endEl();
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
    pranDroid.setIdle(emotionToPranDroidEmotion(buildApiModel()).asIdleAnimation());
    pranDroid.start();
    controls.changed();
  }

  function setInputValue(container: HTMLElement, query: string, value: string) {
    (container.querySelector(query) as HTMLInputElement).value = value;
  }

  function buildApiModel() {
    const layers = [];
    layersMap.forEach(l => {
      layers.push(l.layer);
    });

    return {
      id: emotionModel.id,
      name: emotionModel.name,
      layers: layers.sort((a, b) => a.id !== b.parentId ? 1 : -1)
    };
  }

  async function saveEmotionInApi() {
    if (!emotionModel.id) {
      const emotionApi: EmotionApiModel = await createEmotion({ name: emotionModel.name });
      emotionModel.id = emotionApi.id;
    }

    // update in api
  }

  return (i, r) => {
    r.div();
      emotionModel.layerNodes.forEach(node => drawEmotionLayer(r, node));
    r.endEl();
    r.cmpi(pranCanvas).cmpi(speechBubbleCanvas);
    r.button('button button-positive save-button').text('Save').endEl();

    return e => (
      layersMap.forEach(layerNode => {
        if (layerNode.layer.type === 'Animation') {
          layerNode.layer.frames.forEach((frame, index) => {
            setInputValue(e, `#layer-${layerNode.layer.id}-${index}-frame-start`, frame.frameStart.toString());
            onChange(e, `#layer-${layerNode.layer.id}-${index}-frame-start`, t => (t.target.value !== '' && (frame.frameStart = parseInt(t.target.value), rebuildEmotionPreview())));
            setInputValue(e, `#layer-${layerNode.layer.id}-${index}-frame-end`, frame.frameEnd.toString());
            onChange(e, `#layer-${layerNode.layer.id}-${index}-frame-end`, t => (t.target.value !== '' && (frame.frameEnd = parseInt(t.target.value), rebuildEmotionPreview())));
            onClick(e, `#layer-${layerNode.layer.id}-${index}-image-id`, _ =>
              Modal.open(selectImageModal()).then(result => !!result && (frame.imageId = result.id, rebuildEmotionPreview())));
            onClick(e, `#layer-${layerNode.layer.id}-${index}-delete-image-id`, _ =>
              ((layerNode.layer as EmotionApiAnimationLayerModel).frames.splice(index, 1), rebuildEmotionPreview()));
          });
          onClick(e, `#layer-${layerNode.layer.id}-add-frame`, _ =>
            ((layerNode.layer as EmotionApiAnimationLayerModel).frames.push({ frameStart: 0, frameEnd: 1, imageId: '' }), rebuildEmotionPreview()));
        } else {
          Object.keys(layerNode.layer.mouthMapping).forEach(mouthKey => {
            onClick(e, `#layer-${layerNode.layer.id}-mouth-${mouthKey}`, t =>
              Modal.open(selectImageModal()).then(result => !!result && ((layerNode.layer as EmotionApiMouthLayerModel).mouthMapping[mouthKey] = result.id, rebuildEmotionPreview())))
          });
        }
      }),
      onClick(e, '.save-button', saveEmotionInApi)
    );
  };
});
