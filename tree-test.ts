import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.103.0/testing/asserts.ts";
import { ServerRequest } from "https://deno.land/std@0.103.0/http/server.ts";
import { Tree } from "./tree.ts";
import { analyze } from "./url-analyzer.ts";

type Handler = (request: ServerRequest) => void;
type Handlers = Handler[];

function appleHandler(request: ServerRequest): void {
  request.respond({ body: "apple" });
}

function orangeHandler(request: ServerRequest): void {
  request.respond({ body: "orange" });
}

Deno.test("静的なルート", () => {
  const tree: Tree<Handlers> = new Tree(analyze);
  assertEquals(tree.search("/foo/bar"), undefined);
  assertEquals(tree.search("/foo/baz"), undefined);

  tree.insert("/foo/bar", [appleHandler]);

  let apple = tree.search("/foo/bar");
  assertExists(apple);
  if (apple) assertEquals(apple[0].data, [appleHandler]);

  // 入力パスは正規化される
  apple = tree.search("//foo/bar");
  assertExists(apple);
  if (apple) assertEquals(apple[0].data, [appleHandler]);

  apple = tree.search("/foo/bar/");
  assertExists(apple);
  if (apple) assertEquals(apple[0].data, [appleHandler]);

  assertEquals(tree.search("/foo/baz"), undefined);
  assertEquals(tree.search("/foo"), undefined);
  assertEquals(tree.search("/bar"), undefined);
  assertEquals(tree.search("/baz"), undefined);

  tree.insert("/foo", [orangeHandler]);

  apple = tree.search("/foo/bar");
  assertExists(apple);
  if (apple) assertEquals(apple[0].data, [appleHandler]);

  apple = tree.search("//foo/bar");
  assertExists(apple);
  if (apple) assertEquals(apple[0].data, [appleHandler]);

  apple = tree.search("/foo/bar/");
  assertExists(apple);
  if (apple) assertEquals(apple[0].data, [appleHandler]);

  let orange = tree.search("/foo");
  assertExists(orange);
  if (orange) assertEquals(orange[0].data, [orangeHandler]);

  orange = tree.search("/foo/");
  assertExists(orange);
  if (orange) assertEquals(orange[0].data, [orangeHandler]);

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

Deno.test("パラメータールート", () => {
  const tree: Tree<Handlers> = new Tree(analyze);

  tree.insert("/:id/:sub_id", [orangeHandler]);
  let result = tree.search("/123/456");
  assertExists(result);
  if (result) {
    assertEquals(result[0].data, [orangeHandler]);
    assertEquals(result[1], { id: "123", sub_id: "456" });
  }

  // 先に登録した方が勝つが、スラッシュで区切られたフレーズは守られるか
  tree.insert("/:id", [appleHandler]);
  result = tree.search("/123");
  assertExists(result);
  if (result) {
    assertEquals(result[0].data, [appleHandler]);
    assertEquals(result[1], { id: "123" });
  }

  result = tree.search("/123/456");
  assertExists(result);
  if (result) {
    assertEquals(result[0].data, [orangeHandler]);
    assertEquals(result[1], { id: "123", sub_id: "456" });
  }

  // 末尾のスラッシュが読み捨てられるか
  result = tree.search("/hoge-fuga-boon/");
  assertExists(result);
  if (result) {
    assertEquals(result[0].data, [appleHandler]);
    assertEquals(result[1], { id: "hoge-fuga-boon" });
  }
});

Deno.test("ワイルドカードルート", () => {
  const tree: Tree<string> = new Tree(analyze);
  tree.insert("/api/v1/surveys", "surveys");
  tree.insert("/api/v1/*catch_all", "API 404");
  tree.insert("/*", "All 404");

  let result = tree.search("/api/v1/surveys");
  assertExists(result);
  if (result) {
    assertEquals(result[0].data, "surveys");
    assertEquals(result[1], {});
  }

  result = tree.search("/api/v1/hoge");
  assertExists(result);
  if (result) {
    assertEquals(result[0].data, "API 404");
    assertEquals(result[1], { catch_all: "hoge" });
  }

  result = tree.search("/api/v1/foo/bar");
  assertExists(result);
  if (result) {
    assertEquals(result[0].data, "API 404");
    assertEquals(result[1], { catch_all: "foo/bar" });
  }

  result = tree.search("/foo/bar/baz");
  assertExists(result);
  if (result) {
    assertEquals(result[0].data, "All 404");
    assertEquals(result[1], {});
  }
});

Deno.test("同一の解釈ができる別名パラメータールートは先に登録した方が勝つ", () => {
  // ルートの登録順が優先度順になる
  // ルートが長い方が強いとか静的なものの方がつよいとかしたい場合は探索を別の方法にする必要あり
  const tree: Tree<Handlers> = new Tree(analyze);

  tree.insert("/:id", [appleHandler]);
  tree.insert("/:sub_id", [orangeHandler]);
  const result = tree.search("/123");
  assertExists(result);
  if (result) {
    assertEquals(result[0].data, [appleHandler]);
    assertEquals(result[1], { id: "123" });
  }
});

Deno.test("#search with URL Parameters", () => {
  const tree = new Tree<string>(analyze);
  tree.insert("/foo", "foo");

  let result = tree.search("/foo?bar=baz");
  assertExists(result);
  if (result) {
    assertEquals(result[0].data, "foo");
    assertEquals(result[1], { bar: "baz" });
  }

  result = tree.search("/foo?bar=baz&hoge=fuga");
  assertExists(result);
  if (result) {
    assertEquals(result[0].data, "foo");
    assertEquals(result[1], { bar: "baz", hoge: "fuga" });
  }

  // 中身がないものは無視されるか
  result = tree.search("/foo?bar=baz&&&");
  assertExists(result);
  if (result) {
    assertEquals(result[0].data, "foo");
    assertEquals(result[1], { bar: "baz" });
  }

  // valueがないものは空文字で定義される
  result = tree.search("/foo?bar=baz&hoge");
  assertExists(result);
  if (result) {
    assertEquals(result[0].data, "foo");
    assertEquals(result[1], { bar: "baz", hoge: "" });
  }

  result = tree.search("/foo?bar=baz&hoge=");
  assertExists(result);
  if (result) {
    assertEquals(result[0].data, "foo");
    assertEquals(result[1], { bar: "baz", hoge: "" });
  }

  // URIエンコード
  result = tree.search(
    "/foo?%E3%81%93%E3%82%93%E3%81%AB%E3%81%A1%E3%82%8F=%E4%B8%96%E7%95%8C",
  );
  assertExists(result);
  if (result) {
    assertEquals(result[0].data, "foo");
    assertEquals(result[1], { "こんにちわ": "世界" });
  }

  result = tree.search(
    "/foo?key=%E3%81%82%3D%3D%3D%E3%81%82",
  );
  assertExists(result);
  if (result) {
    assertEquals(result[0].data, "foo");
    assertEquals(result[1], { key: "あ===あ" });
  }
});
