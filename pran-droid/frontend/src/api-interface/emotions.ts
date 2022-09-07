import { retryFetch } from '../helpers/retry-fetch';

export interface EmotionApiMouthLayerModel {
  type: 'Mouth',
  id: string,
  parentId: string,
  mouthMapping: { [key: string]: string },
  translations: { [frame: string]: [number, number] }
}

export interface EmotionApiAnimationLayerModel {
  type: 'Animation',
  id: string,
  parentId: string,
  frames: { frameStart: number, frameEnd: number, imageId: string }[],
  translations: { [frame: string]: [number, number] }
}

export type EmotionApiLayerModel = EmotionApiMouthLayerModel | EmotionApiAnimationLayerModel;

export interface EmotionApiModel {
  id: string,
  name: string,
  layers: EmotionApiLayerModel[],
}

export const getEmotions = () => retryFetch('/api/emotions')
  .then(x => x.json())
  .then(x => {
    console.log('Emotions', x.data);
    x.data.forEach(emotion => emotion.layers.sort((a, b) => a.id !== b.parentId ? 1 : -1))
    return x.data as EmotionApiModel[];
  });