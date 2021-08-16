import { ServerRequest } from "https://deno.land/std@0.103.0/http/server.ts";
import { Tree } from "./tree.ts";
import { RequestContext } from "./request-context.ts";
import { analyze } from "./url-analyzer.ts";

export class MethodNotAllowed extends Error {}
export class NoRoutesMatched extends Error {}

const HandleMethods = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE",
  HEAD: "HEAD",
  OPTIONS: "OPTIONS",
} as const;

type Method = typeof HandleMethods[keyof typeof HandleMethods];

function isMethod(arg: string): arg is Method {
  return Object.keys(HandleMethods).indexOf(arg) >= 0;
}

type Routes<T> = {
  [method in Method]: Tree<T>;
};

export type Handler = (
  request: ServerRequest,
  requestID: string,
  next: () => Handler | undefined,
) => void;

export class Router {
  private routes: Routes<Handler[]>;

  constructor() {
    this.routes = {
      GET: new Tree<Handler[]>(analyze),
      POST: new Tree<Handler[]>(analyze),
      PUT: new Tree<Handler[]>(analyze),
      PATCH: new Tree<Handler[]>(analyze),
      DELETE: new Tree<Handler[]>(analyze),
      HEAD: new Tree<Handler[]>(analyze),
      OPTIONS: new Tree<Handler[]>(analyze),
    };
  }

  private insert(method: Method, path: string, handlers: Handler[]) {
    this.routes[method].insert(path, handlers);
  }

  public get(path: string, handlers: Handler[]) {
    this.insert(HandleMethods.GET, path, handlers);
  }

  public post(path: string, handlers: Handler[]) {
    this.insert(HandleMethods.POST, path, handlers);
  }

  public put(path: string, handlers: Handler[]) {
    this.insert(HandleMethods.PUT, path, handlers);
  }

  public patch(path: string, handlers: Handler[]) {
    this.insert(HandleMethods.PATCH, path, handlers);
  }

  public delete(path: string, handlers: Handler[]) {
    this.insert(HandleMethods.DELETE, path, handlers);
  }

  public head(path: string, handlers: Handler[]) {
    this.insert(HandleMethods.HEAD, path, handlers);
  }

  public options(path: string, handlers: Handler[]) {
    this.insert(HandleMethods.OPTIONS, path, handlers);
  }

  public resolve(request: ServerRequest) {
    const method: Method | string = request.method.toUpperCase();

    if (!isMethod(method)) throw new MethodNotAllowed("method not allowed.");

    const tree: Tree<Handler[]> = this.routes[method];
    if (!tree) throw new Error("missing the route tree");

    const route = tree.search(request.url);
    if (!route) throw new NoRoutesMatched("no routes matched.");

    const [leaf, params] = route;
    const handlers: Handler[] = leaf.data;
    if (!handlers[0]) throw new NoRoutesMatched("missing handler(s).");

    const next = function (i?: number) {
      return function () {
        i === undefined ? i = 0 : i++;
        return handlers[i];
      };
    }();

    const requestID = crypto.randomUUID();
    RequestContext.create(requestID, params);

    try {
      next()(request, requestID, next);
    } finally {
      RequestContext.delete(requestID);
    }
  }
}
