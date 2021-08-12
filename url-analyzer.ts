import { normalize } from "https://deno.land/std@0.103.0/path/mod.ts";
import { Analyzer } from "./tree.ts";

export const analyze: Analyzer = function (path: string): string[] {
  const normalized = normalize(path).split("/");
  const head = normalized.slice(0, -1);
  let tail: string[] = normalized.slice(-1)[0].split("?");
  let query: string[] = [];
  if (tail.length > 1) { // has query parameters
    query = [
      "?" + tail.slice(-1).join(""),
    ];
    tail = tail.slice(0, -1);
  }
  if (tail.slice(-1)[0] === "") tail.pop();
  return head.concat(tail.concat(query));
};
