export type RetryOptions = { retries: number } | { unbound: true };

export class AbortRetry {
  private constructor(public message: string) {}

  public static withMessage(message: string): AbortRetry {
    return new AbortRetry(message);
  }
}

function isBounded(options: RetryOptions): options is { retries: number } {
  return options.hasOwnProperty('retries');
}

export async function retryPromise<T>(cb: () => Promise<T>, options: RetryOptions = { unbound: true }): Promise<T> {
  for (let countDown: number = isBounded(options) ? options.retries : -1;countDown != 0; countDown--) {
    try {
      return await cb();
    } catch(e) {
      if (e instanceof AbortRetry) {
        return Promise.reject(e.message);
      }
      console.warn('Retrying promise');
    }
  }
}