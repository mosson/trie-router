import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.103.0/testing/asserts.ts";
import {
  serve,
  Server,
  ServerRequest,
} from "https://deno.land/std@0.103.0/http/server.ts";
import {
  Handler,
  MethodNotAllowed,
  NoRoutesMatched,
  Router,
} from "./router.ts";
import { RequestContext } from "./request-context.ts";

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
router.get("/get/action", [assertionHandler]);
router.get("/get/empty-handler", []);
router.get("/get/:id/parameters", [assertionHandler]);
router.post("/post/action", [assertionHandler]);
router.post("/post/:resource_id/parameters", [assertionHandler]);
router.get("/middleware/example", [exampleCookieMiddleware, assertionHandler]);

class ExampleCookieStore {
  private static database: { [key: string]: string } = {};
  public static create(key: string, value: string) {
    this.database[key] = value;
  }
  public static read(key: string): string | undefined {
    return this.database[key];
  }
}

function assertionHandler(
  request: ServerRequest,
  requestID: string,
  _next: () => Handler | undefined,
) {
  const params = RequestContext.read(requestID);
  const body = {
    url: request.url,
    method: request.method,
    params: params,
  };
  request.respond({
    status: 200,
    headers: new Headers({
      "X-Request-ID": requestID,
      "Set-Cookie": ExampleCookieStore.read(requestID) || "",
    }),
    body: JSON.stringify(body),
  });
}

function exampleCookieMiddleware(
  request: ServerRequest,
  requestID: string,
  next: () => Handler | undefined,
) {
  let cookie = request.headers.get("Cookie");
  if (!cookie) cookie = `key=${crypto.randomUUID()}`;
  ExampleCookieStore.create(requestID, cookie);
  const nextFn: Handler | undefined = next();
  if (nextFn) {
    nextFn(request, requestID, next);
  }
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
      assertEquals(await response.text(), "method not allowed.");
    },
  },
  {
    name: "No Routes Matched",
    fn: async () => {
      const response = await fetch(`http://localhost:${port}/get/missing`);
      assertEquals(response.status, 404);
      assertEquals(await response.text(), "no routes matched.");
    },
  },
  {
    name: "GET empty handler",
    fn: async () => {
      const response = await fetch(
        `http://localhost:${port}/get/empty-handler`,
      );
      assertEquals(response.status, 404);
      assertEquals(await response.text(), "missing handler(s).");
    },
  },
  {
    name: "GET static routes",
    fn: async () => {
      const response = await fetch(`http://localhost:${port}/get/action`);
      const requestID = response.headers.get("X-Request-ID");
      assertExists(requestID);
      // リクエスト処理後即時削除
      assertEquals(RequestContext.read(requestID), undefined);
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
      const requestID = response.headers.get("X-Request-ID");
      assertExists(requestID);
      // リクエスト処理後即時削除
      assertEquals(RequestContext.read(requestID), undefined);
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
      const requestID = response.headers.get("X-Request-ID");
      assertExists(requestID);
      // リクエスト処理後即時削除
      assertEquals(RequestContext.read(requestID), undefined);

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
      const requestID = response.headers.get("X-Request-ID");
      assertExists(requestID);
      // リクエスト処理後即時削除
      assertEquals(RequestContext.read(requestID), undefined);

      const cookie = response.headers.get("Set-Cookie");
      assertExists(cookie);
      assertEquals(cookie.length, 0);

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
  {
    name: "middleware example",
    fn: async () => {
      const response = await fetch(
        `http://localhost:${port}/middleware/example`,
      );

      const cookie = response.headers.get("Set-Cookie");
      assertExists(cookie);
      assertEquals(cookie.length, 40);

      assertEquals(
        await response.text(),
        JSON.stringify({
          url: "/middleware/example",
          method: "GET",
          params: {},
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
