import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";
import {
  serve,
  Server,
  ServerRequest,
} from "https://deno.land/std@0.103.0/http/server.ts";
import { MethodNotAllowed, NoRoutesMatched, Router } from "./router.ts";
import { Params } from "./tree.ts";

const port = 50000 + Math.round(Math.random() * 10000);
const server: Server = serve({ port: port });

setTimeout(async () => {
  for await (const request of server) {
    try {
      router.resolve(request);
    } catch (e: unknown) {
      if (e instanceof MethodNotAllowed) {
        request.respond({
          status: 405,
          body: e.message,
        });
        continue;
      }
      if (e instanceof NoRoutesMatched) {
        request.respond({
          status: 404,
          body: e.message,
        });
        continue;
      }
      if (e instanceof Error) {
        request.respond({
          status: 400,
          body: e.message,
        });
        continue;
      }

      request.respond({
        status: 500,
        body: "Internal Server Error",
      });
    }
  }
});

const router: Router = new Router();
router.get("/get/action", assertionHandler);
router.get("/get/:id/parameters", assertionHandler);
router.post("/post/action", assertionHandler);
router.post("/post/:resource_id/parameters", assertionHandler);

function assertionHandler(
  request: ServerRequest,
  params: Params,
) {
  const body = {
    url: request.url,
    method: request.method,
    params: params,
  };
  request.respond({
    status: 200,
    body: JSON.stringify(body),
  });
}

const tests: {
  name: string;
  fn: () => Promise<void>;
}[] = [
  {
    name: "Unpermitted Method",
    fn: async () => {
      const response = await fetch(`http://localhost:${port}/get/action`, {
        method: "HOGE",
      });
      assertEquals(response.status, 405);
      assertEquals(await response.text(), "HOGE: method not allowed.");
    },
  },
  {
    name: "No Routes Matched",
    fn: async () => {
      const response = await fetch(`http://localhost:${port}/get/missing`);
      assertEquals(response.status, 404);
      assertEquals(await response.text(), "/get/missing: no routes matched.");
    },
  },
  {
    name: "GET static routes",
    fn: async () => {
      const response = await fetch(`http://localhost:${port}/get/action`);
      assertEquals(
        await response.text(),
        JSON.stringify({
          url: "/get/action",
          method: "GET",
          params: {},
        }),
      );
    },
  },
  {
    name: "GET parameter routes",
    fn: async () => {
      const response = await fetch(
        `http://localhost:${port}/get/1234/parameters?foo=bar`,
      );
      assertEquals(
        await response.text(),
        JSON.stringify({
          url: "/get/1234/parameters?foo=bar",
          method: "GET",
          params: {
            foo: "bar",
            id: "1234",
          },
        }),
      );
    },
  },
  {
    name: "POST static routes",
    fn: async () => {
      const response = await fetch(`http://localhost:${port}/post/action`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded: charset=utf-8",
        },
        body: "foo=bar",
      });
      assertEquals(
        await response.text(),
        JSON.stringify({
          url: "/post/action",
          method: "POST",
          params: {}, // bodyはhandlerの中でパースすること
        }),
      );
    },
  },
  {
    name: "POST parameter routes",
    fn: async () => {
      const response = await fetch(
        `http://localhost:${port}/post/1234/parameters?foo=bar&hoge=fuga`,
        {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded: charset=utf-8",
          },
          body: "foo=bar",
        },
      );
      assertEquals(
        await response.text(),
        JSON.stringify({
          url: "/post/1234/parameters?foo=bar&hoge=fuga",
          method: "POST",
          params: {
            foo: "bar",
            hoge: "fuga",
            resource_id: "1234",
          },
        }),
      );
    },
  },
];

const done = function (i = 0) {
  return () => {
    i++;
    if (i >= tests.length) finish();
  };
}();

function finish() {
  server.close();
}

const fail = function (e: Error) {
  finish();
  throw e;
};

tests.forEach((test) => {
  Deno.test({
    name: test.name,
    fn: () => test.fn().then(done).catch(fail),
    sanitizeResources: false,
    sanitizeOps: false,
  });
});
