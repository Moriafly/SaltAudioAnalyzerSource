// Run with: node examples/plugins/test-musicbrainz.cjs
// This checks the example protocol with a fixture; it does not call the network.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "musicbrainz.js"), "utf8");
const header = source.match(/^\s*\/\* salt-audio-plugin\s*([\s\S]*?)\*\//);
assert.ok(header, "Missing plugin header");
const manifest = JSON.parse(header[1]);
assert.equal(manifest.api, 1);
assert.ok(manifest.hosts.includes("musicbrainz.org"));

const context = vm.createContext({ encodeURIComponent });
vm.runInContext(source, context, { timeout: 2000 });
const iterator = context.search({ title: "Come Together", artist: "The Beatles" });
const request = iterator.next();
assert.equal(request.done, false);
assert.equal(new URL(request.value.url).hostname, "musicbrainz.org");

const fixture = {
  recordings: [{
    title: "Come Together",
    "artist-credit": [{ name: "The Beatles" }],
    releases: [{
      id: "76df3287-6cda-33eb-8e9a-044b5e15ffdd",
      title: "Abbey Road",
      date: "1969-09-26"
    }]
  }]
};
const result = iterator.next({ status: 200, body: JSON.stringify(fixture) });
assert.equal(result.done, true);
assert.equal(result.value.length, 1);
assert.equal(result.value[0].fields.TITLE, "Come Together");
assert.equal(result.value[0].fields.ARTIST, "The Beatles");
assert.equal(result.value[0].fields.ALBUM, "Abbey Road");
assert.equal(result.value[0].fields.DATE, "1969");
assert.equal(new URL(result.value[0].coverUrl).hostname, "coverartarchive.org");
console.log("MusicBrainz example protocol passed");
