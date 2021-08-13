import { Params } from "./tree.ts";

export class RequestContext {
  private static paramsStore: { [key: string]: Params } = {};

  public static add(requestID: string, params: Params): Params {
    this.paramsStore[requestID] = params;
    return params;
  }

  public static getParams(requestID: string): Params | undefined {
    return this.paramsStore[requestID];
  }

  public static delete(requestID: string): Params {
    const params = this.paramsStore[requestID];
    delete this.paramsStore[requestID];
    return params;
  }
}
