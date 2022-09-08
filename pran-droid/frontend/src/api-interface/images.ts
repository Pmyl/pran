import { retryFetch } from '../helpers/retry-fetch';

export interface ImageApiModel {
  id: string;
  url: string;
}

export const getImages = () => retryFetch('/api/images')
  .then(x => x.json())
  .then(x => {
    console.log('Images', x.data);
    return x.data as ImageApiModel[];
  });
