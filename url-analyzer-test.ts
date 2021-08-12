import { analyze } from "./url-analyzer.ts";
import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

Deno.test("analyze", () => {
  // ServerRequest.urlで渡されるリクエストパスを入力に想定して、解析する
  assertEquals(analyze("foo/bar"), ["foo", "bar"]);
  assertEquals(analyze("/foo/bar"), ["", "foo", "bar"]);

  // 末尾のスラッシュは空文字として追加されない
  assertEquals(analyze("/foo/bar/"), ["", "foo", "bar"]);

  // URLは正規化されて評価される
  assertEquals(analyze("/foo///bar"), ["", "foo", "bar"]);
  assertEquals(analyze("/foo//./bar"), ["", "foo", "bar"]);
  assertEquals(analyze("/foo/.././bar"), ["", "bar"]);

  // URLパラメータは末尾に分割して追加する
  assertEquals(analyze("/foo/bar?hoge=fuga"), ["", "foo", "bar", "?hoge=fuga"]);
  assertEquals(analyze("/foo/bar/?hoge=fuga"), [
    "",
    "foo",
    "bar",
    "?hoge=fuga",
  ]);
  assertEquals(analyze("/foo/bar?hoge=fuga&hello=world"), [
    "",
    "foo",
    "bar",
    "?hoge=fuga&hello=world",
  ]);

  // URLパラメータの末尾のスラッシュは削除されるのでどうしても使いたい場合はURLエンコードすること
  assertEquals(analyze("/foo/bar/?hoge=slash/"), [
    "",
    "foo",
    "bar",
    "?hoge=slash",
  ]);
});
