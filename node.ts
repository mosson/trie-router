export class Node<T> {
  private data: string | undefined;
  public children: Node<T>[];
  public leaf: Leaf<T> | undefined;
  constructor(data: string | undefined) {
    this.data = data;
    this.children = [];
    this.leaf = undefined;
  }

  public search(seq: string | undefined): Node<T> | undefined {
    if (seq === undefined) return undefined;
    return this.children.find((child) => {
      return child.data === seq;
    });
  }

  public insert(seq: string | undefined): Node<T> {
    const child = new Node<T>(seq);
    this.children.push(child);
    return child;
  }
}

export class Leaf<T> {
  public data: T;
  constructor(data: T) {
    this.data = data;
  }
}
