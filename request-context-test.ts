import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";
import { RequestContext } from "./request-context.ts";
import { MemoryStore } from "./request-context/memory-store.ts";

Deno.test("Without init(), use MemoryStore", () => {
  assertEquals(RequestContext.store instanceof MemoryStore, true);
});
