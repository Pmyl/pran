import { RetryOptions, retryPromise } from './retry-promise';

export function retryFetch(input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1], options?: RetryOptions): Promise<Response> {
  return retryPromise(() => fetch(input, init), options);
}