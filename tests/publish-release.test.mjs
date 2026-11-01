// The release step joins split GitHub releases and publishes one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { consolidateRelease, missingPieces } from "../tools/publish-release.js";

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
    arrayBuffer: async () => Buffer.from(JSON.stringify(body)),
  };
}

test("a split tag becomes one published release with the exe, blockmap, and latest.yml", async () => {
  const calls = [];
  const releases = [
    {
      id: 1, tag_name: "v2.5.0", draft: true,
      upload_url: "https://uploads.github.com/repos/bitwizard25/dsa_prep/releases/1/assets{?name,label}",
      assets: [
        { name: "dsa_prep_setup_2.5.0.exe", url: "https://api.github.com/asset/exe" },
        { name: "latest.yml", url: "https://api.github.com/asset/yml" },
      ],
    },
    {
      id: 2, tag_name: "v2.5.0", draft: true,
      upload_url: "https://uploads.github.com/repos/bitwizard25/dsa_prep/releases/2/assets{?name,label}",
      assets: [{ name: "dsa_prep_setup_2.5.0.exe.blockmap", url: "https://api.github.com/asset/map" }],
    },
  ];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, method: options.method || "GET", accept: options.headers && options.headers.Accept });
    if (String(url).includes("/releases?")) return jsonResponse(releases);
    if (String(url) === "https://api.github.com/asset/map") {
      return { ok: true, status: 302, headers: { get: (h) => (h === "location" ? "https://files.example/map" : null) }, text: async () => "" };
    }
    if (String(url) === "https://files.example/map") {
      return { ok: true, status: 200, headers: { get: () => null }, arrayBuffer: async () => Buffer.from("map-bytes") };
    }
    if (String(url).includes("/releases/2") && options.method === "DELETE") return jsonResponse({});
    if (String(url).startsWith("https://uploads.github.com/") && options.method === "POST") return jsonResponse({ name: "dsa_prep_setup_2.5.0.exe.blockmap" });
    if (String(url).includes("/releases/1") && options.method === "PATCH") {
      return jsonResponse({ html_url: "https://github.com/bitwizard25/dsa_prep/releases/tag/v2.5.0", draft: false });
    }
    throw new Error(`unexpected ${options.method || "GET"} ${url}`);
  };
  const result = await consolidateRelease({ owner: "bitwizard25", repo: "dsa_prep", tag: "v2.5.0", token: "test-token", fetchImpl });
  assert.equal(result.draft, false);
  assert.deepEqual(result.names, ["dsa_prep_setup_2.5.0.exe", "dsa_prep_setup_2.5.0.exe.blockmap", "latest.yml"]);
  assert.equal(calls.some((c) => c.method === "DELETE" && c.url.endsWith("/releases/2")), true);
  assert.equal(calls.some((c) => c.method === "POST" && c.url.includes("name=dsa_prep_setup_2.5.0.exe.blockmap")), true);
  const patch = calls.find((c) => c.method === "PATCH");
  assert.ok(patch);
  assert.equal(missingPieces(result.names).length, 0);
});

test("a release that never got a blockmap is an error", async () => {
  const fetchImpl = async (url) => {
    if (String(url).includes("/releases?")) {
      return jsonResponse([{
        id: 9, tag_name: "v2.5.0", draft: true, upload_url: "https://uploads.github.com/assets{?name,label}",
        assets: [{ name: "dsa_prep_setup_2.5.0.exe", url: "https://api.github.com/asset/exe" }],
      }]);
    }
    throw new Error(`unexpected ${url}`);
  };
  await assert.rejects(
    () => consolidateRelease({ owner: "acme", repo: "app", tag: "v2.5.0", token: "test-token", fetchImpl }),
    /blockmap/,
  );
});
