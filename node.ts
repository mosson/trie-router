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
      return child.isVariable || child.isWildcard || child.data === seq;
    });
  }

  public insert(seq: string | undefined): Node<T> {
    const child = new Node<T>(seq);
    this.children.push(child);
    return child;
  }

  public get isVariable(): true | false {
    if (this.data === undefined) return false;
    return this.data.substr(0, 1) === ":";
  }

  public get isWildcard(): true | false {
    if (this.data === undefined) return false;
    return this.data.substr(0, 1) === "*";
  }

  public get variableName(): string | undefined {
    if (this.data === undefined) return undefined;
    if (this.data === "*") return undefined;
    return this.data.substr(1);
  }
}

export class Leaf<T> {
  public data: T;
  constructor(data: T) {
    this.data = data;
  }
}
