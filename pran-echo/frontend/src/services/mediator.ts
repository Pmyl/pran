export interface IEvent<TName extends string, T> {
  name: TName;
  value: T;
}

class MediatorService {
  private _subscribers: Map<string, ((event: unknown) => void)[]> = new Map<string, ((event: unknown) => void)[]>();

  public onEvent<T extends IEvent<any, any>>(eventName: T['name'], cb: (event: T['value']) => void): () => void {
    let list;

    if (!this._subscribers.has(eventName)) {
      list = [];
      this._subscribers.set(eventName, list);
    } else {
      list = this._subscribers.get(eventName);
    }

    list.push(cb);

    return () => {
      this._subscribers.get(eventName).splice(this._subscribers.get(eventName).indexOf(cb), 1);
    };
  }

  public raiseEvent<T extends IEvent<any, any>>(eventName: T['name'], event: T['value']): void {
    let list;

    if (!this._subscribers.has(eventName)) {
      list = [];
      this._subscribers.set(eventName, list);
    } else {
      list = this._subscribers.get(eventName);
    }

    list.forEach(s => {
      s(event);
    });
  }
}

export const Mediator: MediatorService = new MediatorService();