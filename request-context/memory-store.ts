import { Params } from "../tree.ts";
import { Store } from "../request-context.ts";

export class MemoryStore implements Store {
  private database: { [key: string]: Params };

  constructor() {
    this.database = {};
  }

  public create(requestID: string, params: Params): Params {
    this.database[requestID] = params;
    return params;
  }

  public read(requestID: string): Params | undefined {
    return this.database[requestID];
  }

  public delete(requestID: string): Params {
    const params = this.database[requestID];
    delete this.database[requestID];
    return params;
  }
}
