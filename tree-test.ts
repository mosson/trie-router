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

Deno.test("Tree test", () => {
  const tree: Tree<Handlers> = new Tree();
  assertEquals(tree.search("/foo/bar"), undefined);
  assertEquals(tree.search("/foo/baz"), undefined);

  tree.insert("/foo/bar", [appleHandler]);

  let apple = tree.search("/foo/bar");
  assertExists(apple);
  if (apple) assertEquals(apple.data, [appleHandler]);

  apple = tree.search("//foo/bar");
  assertExists(apple);
  if (apple) assertEquals(apple.data, [appleHandler]);

  apple = tree.search("/foo/bar/");
  assertExists(apple);
  if (apple) assertEquals(apple.data, [appleHandler]);

  assertEquals(tree.search("/foo/baz"), undefined);
  assertEquals(tree.search("/foo"), undefined);
  assertEquals(tree.search("/bar"), undefined);
  assertEquals(tree.search("/baz"), undefined);

  tree.insert("/foo", [orangeHandler]);

  apple = tree.search("/foo/bar");
  assertExists(apple);
  if (apple) assertEquals(apple.data, [appleHandler]);

  apple = tree.search("//foo/bar");
  assertExists(apple);
  if (apple) assertEquals(apple.data, [appleHandler]);

  apple = tree.search("/foo/bar/");
  assertExists(apple);
  if (apple) assertEquals(apple.data, [appleHandler]);

  let orange = tree.search("/foo");
  assertExists(orange);
  if (orange) assertEquals(orange.data, [orangeHandler]);

  orange = tree.search("/foo/");
  assertExists(orange);
  if (orange) assertEquals(orange.data, [orangeHandler]);

  assertEquals(tree.search("/fo"), undefined);
  assertEquals(tree.search("/fooo"), undefined);
  assertEquals(tree.search("/bar"), undefined);
  assertEquals(tree.search("/baz"), undefined);

  try {
    tree.delete("apple");
  } catch (_) {
    assertEquals(true, false);
  }

  tree.delete("/foo");
  assertEquals(tree.search("/foo"), undefined);
});
