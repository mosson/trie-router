import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";
import { MethodNotAllowed, NoRoutesMatched, Params, Router } from "./router.ts";

const port = 50000 + Math.round(Math.random() * 10000);
const server = Deno.listen({ port: port });

setTimeout(async () => {
  for await (const conn of server) {
    (async () => {
      const httpConn = Deno.serveHttp(conn);
      for await (const requestEvent of httpConn) {
        try {
          router.resolve(requestEvent);
        } catch (e: unknown) {
          if (e instanceof MethodNotAllowed) {
            requestEvent.respondWith(new Response(e.message, { status: 405 }));
            continue;
          }
          if (e instanceof NoRoutesMatched) {
            requestEvent.respondWith(new Response(e.message, { status: 404 }));
            continue;
          }
          if (e instanceof Error) {
            requestEvent.respondWith(new Response(e.message, { status: 400 }));
            continue;
          }

          requestEvent.respondWith(
            new Response("Internal Server Error", { status: 500 }),
          );
        }
      }
    })();
  }
});

const router: Router = new Router();
router.get("/get/action", assertionHandler);
router.get<{ id: string }>("/get/:id/parameters", assertionHandler);
router.post("/post/action", assertionHandler);
router.post<{ resource_id: string }>(
  "/post/:resource_id/parameters",
  assertionHandler,
);

function assertionHandler(
  event: Deno.RequestEvent,
  params: Params,
) {
  const url = new URL(event.request.url);
  const body = {
    url: url.pathname + url.search,
    method: event.request.method,
    params: params,
  };
  event.respondWith(new Response(JSON.stringify(body), { status: 200 }));
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
      assertEquals(
        await response.text(),
        "/get/missing: no routes matched.",
      );
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
  return (e?: unknown) => {
    i++;
    if (i >= tests.length) finish();
    if (e) throw e;
  };
}();

function finish() {
  Object.keys(Deno.resources()).slice(3).forEach((rid) => {
    Deno.close(Number(rid));
  });
}

tests.forEach((test) => {
  Deno.test({
    name: test.name,
    fn: () => test.fn().then(done).catch(done),
    sanitizeResources: false,
    sanitizeOps: false,
  });
});
