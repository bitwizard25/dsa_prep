// electron-builder can open two GitHub releases for one tag: the installer on one,
// the blockmap on the other. This joins those files onto one release and publishes it.
const https = require("https");

const EXE = (name) => name.endsWith(".exe") && !name.endsWith(".blockmap");
const BLOCKMAP = (name) => name.endsWith(".exe.blockmap");

function missingPieces(names) {
  const missing = [];
  if (!names.some(EXE)) missing.push("installer (.exe)");
  if (!names.some(BLOCKMAP)) missing.push("blockmap (.exe.blockmap)");
  if (!names.includes("latest.yml")) missing.push("latest.yml");
  return missing;
}

function pickKeeper(releases) {
  return releases.slice().sort((a, b) => {
    const ae = a.assets.some((asset) => EXE(asset.name)) ? 1 : 0;
    const be = b.assets.some((asset) => EXE(asset.name)) ? 1 : 0;
    return be - ae || b.assets.length - a.assets.length;
  })[0];
}

async function github(fetchImpl, token, url, options = {}) {
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "dsa-prep-release",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(options.headers || {}),
  };
  const res = await fetchImpl(url, { ...options, headers });
  if (res.status === 301 || res.status === 302 || res.status === 307) {
    return { redirect: res.headers.get("location"), status: res.status };
  }
  const text = await res.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  if (!res.ok) {
    const detail = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(`GitHub ${options.method || "GET"} ${url} failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  return { body, status: res.status };
}

async function listReleases(fetchImpl, token, owner, repo) {
  const releases = [];
  for (let page = 1; page <= 5; page++) {
    const { body } = await github(fetchImpl, token, `https://api.github.com/repos/${owner}/${repo}/releases?per_page=100&page=${page}`);
    if (!Array.isArray(body) || body.length === 0) break;
    releases.push(...body);
    if (body.length < 100) break;
  }
  return releases;
}

async function downloadAsset(fetchImpl, token, asset) {
  // The asset API either redirects to the file or returns the bytes directly.
  const res = await fetchImpl(asset.url, {
    redirect: "manual",
    headers: {
      Accept: "application/octet-stream",
      Authorization: `Bearer ${token}`,
      "User-Agent": "dsa-prep-release",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  const location = res.headers.get("location");
  if ((res.status === 301 || res.status === 302 || res.status === 307) && location) {
    const bin = await fetchImpl(location);
    if (!bin.ok) throw new Error(`Download of ${asset.name} failed (${bin.status})`);
    return Buffer.from(await bin.arrayBuffer());
  }
  if (!res.ok) throw new Error(`Download of ${asset.name} failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadAsset(fetchImpl, token, release, name, data) {
  const base = String(release.upload_url || "").replace(/\{.*$/, "");
  const url = `${base}?name=${encodeURIComponent(name)}`;
  await github(fetchImpl, token, url, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: data,
  });
}

async function consolidateRelease({ owner, repo, tag, token, fetchImpl = globalThis.fetch }) {
  if (!owner || !repo || !tag || !token) throw new Error("owner, repo, tag, and token are required");
  const releases = (await listReleases(fetchImpl, token, owner, repo)).filter((r) => r.tag_name === tag);
  if (releases.length === 0) throw new Error(`No GitHub release for ${tag}`);
  const keeper = pickKeeper(releases);
  const names = new Set(keeper.assets.map((a) => a.name));
  for (const other of releases) {
    if (other.id === keeper.id) continue;
    for (const asset of other.assets) {
      if (names.has(asset.name)) continue;
      const data = await downloadAsset(fetchImpl, token, asset);
      await uploadAsset(fetchImpl, token, keeper, asset.name, data);
      names.add(asset.name);
    }
    await github(fetchImpl, token, `https://api.github.com/repos/${owner}/${repo}/releases/${other.id}`, { method: "DELETE" });
  }
  const missing = missingPieces([...names]);
  if (missing.length) throw new Error(`Release ${tag} is missing ${missing.join(", ")}`);
  const { body } = await github(fetchImpl, token, `https://api.github.com/repos/${owner}/${repo}/releases/${keeper.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draft: false, prerelease: false, make_latest: "true" }),
  });
  return {
    id: keeper.id,
    tag,
    draft: false,
    names: [...names].sort(),
    htmlUrl: body && body.html_url,
  };
}

async function main() {
  const repoSpec = process.env.GITHUB_REPOSITORY || "bitwizard25/dsa_prep";
  const [owner, repo] = repoSpec.split("/");
  const tag = process.env.GITHUB_REF_NAME || "";
  if (!/^v\d+\.\d+\.\d+$/.test(tag)) throw new Error(`GITHUB_REF_NAME must be a version tag, got ${tag || "(empty)"}`);
  const result = await consolidateRelease({ owner, repo, tag, token: process.env.GH_TOKEN || process.env.GITHUB_TOKEN });
  console.log(`Published ${result.tag}: ${result.names.join(", ")}`);
  if (result.htmlUrl) console.log(result.htmlUrl);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}

module.exports = { consolidateRelease, missingPieces, pickKeeper };
