import { Tree } from "./tree.ts";
import { analyze } from "./url-analyzer.ts";

export class MethodNotAllowed extends Error {}
export class NoRoutesMatched extends Error {}

export const HandleMethods = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE",
  HEAD: "HEAD",
  OPTIONS: "OPTIONS",
} as const;

export type Method = typeof HandleMethods[keyof typeof HandleMethods];

function isMethod(arg: string): arg is Method {
  return Object.keys(HandleMethods).indexOf(arg) >= 0;
}

type Routes<T> = {
  [method in Method]: Tree<T>;
};

export type Params = { [key: string]: string };

export type Handler = (request: Deno.RequestEvent, params: Params) => void;

export class Router {
  private routes: Routes<Handler>;

  constructor() {
    this.routes = {
      GET: new Tree<Handler>(analyze),
      POST: new Tree<Handler>(analyze),
      PUT: new Tree<Handler>(analyze),
      PATCH: new Tree<Handler>(analyze),
      DELETE: new Tree<Handler>(analyze),
      HEAD: new Tree<Handler>(analyze),
      OPTIONS: new Tree<Handler>(analyze),
    };
  }

  public insert(method: Method, path: string, handler: Handler) {
    this.routes[method].insert(path, handler);
  }

  public get(path: string, handler: Handler) {
    this.insert(HandleMethods.GET, path, handler);
  }

  public post(path: string, handler: Handler) {
    this.insert(HandleMethods.POST, path, handler);
  }

  public put(path: string, handler: Handler) {
    this.insert(HandleMethods.PUT, path, handler);
  }

  public patch(path: string, handler: Handler) {
    this.insert(HandleMethods.PATCH, path, handler);
  }

  public delete(path: string, handler: Handler) {
    this.insert(HandleMethods.DELETE, path, handler);
  }

  public head(path: string, handler: Handler) {
    this.insert(HandleMethods.HEAD, path, handler);
  }

  public options(path: string, handler: Handler) {
    this.insert(HandleMethods.OPTIONS, path, handler);
  }

  public resolve(event: Deno.RequestEvent) {
    const method: Method | string = event.request.method.toUpperCase();

    if (!isMethod(method)) {
      throw new MethodNotAllowed(`${method}: method not allowed.`);
    }

    const tree: Tree<Handler> = this.routes[method];
    if (!tree) throw new Error("missing the route tree");

    const url = new URL(event.request.url);
    const route = tree.search(url.pathname + url.search);
    if (!route) {
      throw new NoRoutesMatched(`${url.pathname}: no routes matched.`);
    }

    const [leaf, params] = route;
    const handler: Handler = leaf.data;
    if (!handler) throw new NoRoutesMatched("missing handler.");
    handler(event, params);
  }
}
