import { Leaf, Node } from "./node.ts";

type Params = { [key: string]: string };

export type Analyzer = (data: string) => string[];

export class Tree<T> {
  private static resolveQuery(text: string): Params {
    if (!text || text.substr(0, 1) !== "?") return {};
    return text.substr(1).split("&").reduce(
      (params: Params, fragment: string) => {
        const pair = fragment.split("=");
        if (pair[0]) {
          params[decodeURIComponent(pair[0])] = decodeURIComponent(
            pair.slice(1).join(""),
          );
        }
        return params;
      },
      {},
    );
  }

  private root: Node<T>;
  private analyze: Analyzer;

  constructor(analyze: Analyzer) {
    this.root = new Node<T>(undefined);
    this.analyze = analyze;
  }

  public insert(path: string, handler: T) {
    const seq = this.analyze(path);

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
    const seq = this.analyze(path);
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
    const seq = this.analyze(path);
    let node: Node<T> | undefined = this.root;
    for (let i = 0; i < seq.length; i++) {
      node = node.search(seq.slice(i, i + 1)[0]);
      if (!node) return;
    }

    node.leaf = undefined;
  }
}
