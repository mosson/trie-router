import { normalize } from "https://deno.land/std@0.103.0/path/mod.ts";
import { Leaf, Node } from "./node.ts";

export class Tree<T> {
  private static normalize(path: string): string[] {
    const normalized = normalize(path).split("/");
    if (normalized[normalized.length - 1] === "") normalized.pop();
    return normalized;
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

  public staticSearch(path: string): Leaf<T> | undefined {
    const seq = Tree.normalize(path);
    let node: Node<T> | undefined = this.root;
    for (let i = 0; i < seq.length; i++) {
      node = node.search(seq.slice(i, i + 1)[0]);
      if (!node) return undefined;
    }

    return node.leaf;
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
