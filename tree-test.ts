import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.103.0/testing/asserts.ts";
import { ServerRequest } from "https://deno.land/std@0.103.0/http/server.ts";
import { Tree } from "./tree.ts";

type Handler = (request: ServerRequest) => void;
type Handlers = Handler[];

function appleHandler(request: ServerRequest): void {
  request.respond({ body: "apple" });
}

function orangeHandler(request: ServerRequest): void {
  request.respond({ body: "orange" });
}

orangeHandler;

Deno.test("Tree test", () => {
  const tree: Tree<Handlers> = new Tree();
  assertEquals(tree.staticSearch("/foo/bar"), undefined);
  assertEquals(tree.staticSearch("/foo/baz"), undefined);

  tree.insert("/foo/bar", [appleHandler]);

  let apple = tree.staticSearch("/foo/bar");
  assertExists(apple);
  if (apple) assertEquals(apple.data, [appleHandler]);

  apple = tree.staticSearch("//foo/bar");
  assertExists(apple);
  if (apple) assertEquals(apple.data, [appleHandler]);

  apple = tree.staticSearch("/foo/bar/");
  assertExists(apple);
  if (apple) assertEquals(apple.data, [appleHandler]);

  assertEquals(tree.staticSearch("/foo/baz"), undefined);
  assertEquals(tree.staticSearch("/foo"), undefined);
  assertEquals(tree.staticSearch("/bar"), undefined);
  assertEquals(tree.staticSearch("/baz"), undefined);

  tree.insert("/foo", [orangeHandler]);

  apple = tree.staticSearch("/foo/bar");
  assertExists(apple);
  if (apple) assertEquals(apple.data, [appleHandler]);

  apple = tree.staticSearch("//foo/bar");
  assertExists(apple);
  if (apple) assertEquals(apple.data, [appleHandler]);

  apple = tree.staticSearch("/foo/bar/");
  assertExists(apple);
  if (apple) assertEquals(apple.data, [appleHandler]);

  let orange = tree.staticSearch("/foo");
  assertExists(orange);
  if (orange) assertEquals(orange.data, [orangeHandler]);

  orange = tree.staticSearch("/foo/");
  assertExists(orange);
  if (orange) assertEquals(orange.data, [orangeHandler]);

  assertEquals(tree.staticSearch("/fo"), undefined);
  assertEquals(tree.staticSearch("/fooo"), undefined);
  assertEquals(tree.staticSearch("/bar"), undefined);
  assertEquals(tree.staticSearch("/baz"), undefined);

  try {
    tree.delete("apple");
  } catch (_) {
    assertEquals(true, false);
  }

  tree.delete("/foo");
  assertEquals(tree.staticSearch("/foo"), undefined);
});
