トライ木実装のルーター（学習用）
===

## コンセプト

トライ木で例示されることが多い1文字分割ではなく `/` で区切られるフレーズをノードとして探索する。
サーバーサイドのアプリケーションで利用されることを想定している。
各HTTPメソッドごとにトライ木は分離して保持される。
探査時はルーターに登録した順に評価される。（初手でワイルドカードを仕込むと後続の登録には到達しなくなる）
Cookie/Sessionやアプリケーション独自の拡張はこの実装では対応しない（ルータをラップして拡張する用途を想定）

## Example

```typescript
import { Router } from "./router.ts";
const router: Router = new Router();
router.get(
  "/get/action", 
  (event: Deno.RequestEvent, params: {[key: string]: string}) =>{
    console.log(params); // {}
    event.respondWith(new Response("Hello, World"));
  }
);
// パスのフレーズに `:` を含む場合はパラメータに渡される
router.get(
  "/get/:id/parameters", 
  (event: Deno.RequestEvent, params: {[key: string]: string}) =>{
    console.log(params); // {id: "XXX"}
    event.respondWith(new Response("Hello, World"));
  }
);
// パスのフレーズに `*` を含む場合それ以降のフレーズはノードに分割されない。
// `*` 以降に文字列が含まれる場合はパラメータに渡される
router.get(
  "/wild/*foo", 
  (event: Deno.RequestEvent, params: {[key: string]: string}) =>{
    console.log(params); // {foo: "XXX"}
    event.respondWith(new Response("Hello, World"));
  }
);
// GET | POST | PUT | PATCH | HEAD | OPTIONS に対応する
router.post(
  "/post/action", 
  (event: Deno.RequestEvent, params: {[key: string]: string}) =>{
    console.log(params); // {} => リクエストボディはパラメータには含まれない
    event.respondWith(new Response("Hello, World"));
  }
);

const listener = Deno.listen({ port: 8000 });
for await (const conn of listener) {
  (async () => {
    const requests = Deno.serveHttp(conn);
    for await (const requestEvent of requests) {
      router.resolve(requestEvent); // 一致するパス設定した関数があれば呼び出す。なければ例外をあげる
    }
  })();
}

// % curl http://localhost:8000/get/action
// % curl http://localhost:8000/get/123/parameters
// % curl http://localhost:8000/wild/hogehoge/fugafuga
// % curl -X POST http://localhost:8000/post/action
```