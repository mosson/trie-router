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

export type Handler<T> = (
  request: Deno.RequestEvent,
  params: T extends Params ? T : Params,
) => void;

export class Router {
  private routes: Routes<Handler<unknown>>;

  constructor() {
    this.routes = {
      GET: new Tree<Handler<unknown>>(analyze),
      POST: new Tree<Handler<unknown>>(analyze),
      PUT: new Tree<Handler<unknown>>(analyze),
      PATCH: new Tree<Handler<unknown>>(analyze),
      DELETE: new Tree<Handler<unknown>>(analyze),
      HEAD: new Tree<Handler<unknown>>(analyze),
      OPTIONS: new Tree<Handler<unknown>>(analyze),
    };
  }

  public insert<T>(method: Method, path: string, handler: Handler<T>) {
    this.routes[method].insert(path, handler as Handler<unknown>);
  }

  public get<T>(path: string, handler: Handler<T>) {
    this.insert(HandleMethods.GET, path, handler);
  }

  public post<T>(path: string, handler: Handler<T>) {
    this.insert(HandleMethods.POST, path, handler);
  }

  public put<T>(path: string, handler: Handler<T>) {
    this.insert(HandleMethods.PUT, path, handler);
  }

  public patch<T>(path: string, handler: Handler<T>) {
    this.insert(HandleMethods.PATCH, path, handler);
  }

  public delete<T>(path: string, handler: Handler<T>) {
    this.insert(HandleMethods.DELETE, path, handler);
  }

  public head<T>(path: string, handler: Handler<T>) {
    this.insert(HandleMethods.HEAD, path, handler);
  }

  public options<T>(path: string, handler: Handler<T>) {
    this.insert(HandleMethods.OPTIONS, path, handler);
  }

  public resolve(event: Deno.RequestEvent) {
    const method: Method | string = event.request.method.toUpperCase();

    if (!isMethod(method)) {
      throw new MethodNotAllowed(`${method}: method not allowed.`);
    }

    const tree: Tree<Handler<Params>> = this.routes[method];
    if (!tree) throw new Error("missing the route tree");

    const url = new URL(event.request.url);
    const route = tree.search(url.pathname + url.search);
    if (!route) {
      throw new NoRoutesMatched(`${url.pathname}: no routes matched.`);
    }

    const [leaf, params] = route;
    const handler: Handler<Params> = leaf.data;
    if (!handler) throw new NoRoutesMatched("missing handler.");
    handler(event, params);
  }
}
