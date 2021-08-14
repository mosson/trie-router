import { Params } from "./tree.ts";
import { MemoryStore } from "./request-context/memory-store.ts";

export interface Store {
  create: (requestID: string, params: Params) => Params;
  read: (requestID: string) => Params | undefined;
  delete: (requestID: string) => Params;
}

export class RequestContext {
  public static store: Store = new MemoryStore();

  public static init(store: Store) {
    this.store = store;
  }

  public static create(requestID: string, params: Params): Params {
    return this.store.create(requestID, params);
  }

  public static read(requestID: string): Params | undefined {
    return this.store.read(requestID);
  }

  public static delete(requestID: string): Params {
    return this.store.delete(requestID);
  }
}
