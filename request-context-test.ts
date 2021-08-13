import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";
import { RequestContext } from "./request-context.ts";

Deno.test("RequestContext", () => {
  const requestID1 = crypto.randomUUID();
  const requestID2 = crypto.randomUUID();

  assertEquals(RequestContext.getParams(requestID1), undefined);
  assertEquals(RequestContext.getParams(requestID2), undefined);

  assertEquals(
    RequestContext.add(requestID1, { foo: "bar" }),
    { foo: "bar" },
  );
  assertEquals(
    RequestContext.add(requestID2, { hoge: "piyo" }),
    { hoge: "piyo" },
  );
  assertEquals(
    RequestContext.getParams(requestID1),
    { foo: "bar" },
  );
  assertEquals(
    RequestContext.getParams(requestID2),
    { hoge: "piyo" },
  );
  assertEquals(
    RequestContext.delete(requestID1),
    { foo: "bar" },
  );
  assertEquals(
    RequestContext.delete(requestID2),
    { hoge: "piyo" },
  );
  assertEquals(RequestContext.getParams(requestID1), undefined);
  assertEquals(RequestContext.getParams(requestID2), undefined);
});
