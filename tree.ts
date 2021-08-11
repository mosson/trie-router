import { normalize } from "https://deno.land/std@0.103.0/path/mod.ts";
import { Leaf, Node } from "./node.ts";

type Params = { [key: string]: string };

export class Tree<T> {
  private static normalize(path: string): string[] {
    let normalized = normalize(path).split("/");
    const head = normalized.slice(0, -1);
    let tail = normalized.slice(-1)[0].split("?");
    if (tail.length > 1) {
      tail = tail.slice(0, -1).concat([
        "?" + tail.slice(-1).join(""),
      ]);
    }
    normalized = head.concat(tail);

    if (normalized.slice(-1)[0] === "") normalized.pop();
    return normalized;
  }

  private static resolveQuery(text: string): Params {
    if (!text || text.substr(0, 1) !== "?") return {};
    return text.substr(1).split("&").reduce(
      (params: Params, fragment: string) => {
        const pair = fragment.split("=");
        if (pair[0]) params[pair[0]] = pair.slice(1).join("");
        return params;
      },
      {},
    );
  }

  private root: Node<T>;

  constructor() {
    this.root = new Node<T>(undefined);
  }

  public insert(path: string, handler: T) {
    const seq = Tree.normalize(path);

    let node: Node<T> = this.root;
    for (let i = 0; i < seq.length; i++) {
      let child = node.search(seq.slice(i, i + 1)[0]);
      if (!child) {
        child = node.insert(seq.slice(i, i + 1)[0]);
      }
      node = child;
    }

    if (!node.leaf) node.leaf = new Leaf<T>(handler);
  }

  public search(path: string): [Leaf<T>, Params] | undefined {
    const seq = Tree.normalize(path);
    let params: Params = {};

    // pathにURLパラメーターが含まれる場合はparamsに代入して、探査からは除外する
    const queryIndex = seq.findIndex((phrase) => {
      return phrase.substr(0, 1) === "?";
    });
    if (queryIndex >= 0) {
      params = Tree.resolveQuery(seq.splice(queryIndex).join(""));
    }

    let node: Node<T> | undefined = this.root;
    for (let i = 0; i < seq.length; i++) {
      const phrase: string = seq.slice(i, i + 1)[0];

      node = node.search(phrase);
      if (!node) return undefined;

      // パラメーターの読み取り
      if (node.isVariable && node.variableName) {
        params[node.variableName] = phrase;
      }

      // ワイルドカードの場合はスラッシュの区切り以後も全て読み出し
      if (node.isWildcard) {
        if (node.variableName) {
          params[node.variableName] = seq.slice(i).join("/");
        }
        break;
      }
    }

    if (!node.leaf) return undefined;
    return [node.leaf, params];
  }

  public delete(path: string): void {
    const seq = Tree.normalize(path);
    let node: Node<T> | undefined = this.root;
    for (let i = 0; i < seq.length; i++) {
      node = node.search(seq.slice(i, i + 1)[0]);
      if (!node) return;
    }

    node.leaf = undefined;
  }
}
