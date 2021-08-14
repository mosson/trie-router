import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";
import { MemoryStore } from "./memory-store.ts";

Deno.test("MemoryStore", () => {
  const store: MemoryStore = new MemoryStore();

  const requestID1 = crypto.randomUUID();
  const requestID2 = crypto.randomUUID();

  assertEquals(store.read(requestID1), undefined);
  assertEquals(store.read(requestID2), undefined);

  assertEquals(
    store.create(requestID1, { foo: "bar" }),
    { foo: "bar" },
  );
  assertEquals(
    store.create(requestID2, { hoge: "piyo" }),
    { hoge: "piyo" },
  );
  assertEquals(
    store.read(requestID1),
    { foo: "bar" },
  );
  assertEquals(
    store.read(requestID2),
    { hoge: "piyo" },
  );
  assertEquals(
    store.delete(requestID1),
    { foo: "bar" },
  );
  assertEquals(
    store.delete(requestID2),
    { hoge: "piyo" },
  );
  assertEquals(store.read(requestID1), undefined);
  assertEquals(store.read(requestID2), undefined);
});
