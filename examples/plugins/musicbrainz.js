/* salt-audio-plugin
{
  "api": 1,
  "id": "org.saltaudio.examples.musicbrainz",
  "name": "MusicBrainz 示例",
  "version": "1.0.0",
  "hosts": ["musicbrainz.org", "coverartarchive.org", "archive.org", "*.archive.org"]
}
*/

// This example is independently implemented against the public MusicBrainz API.
function* search(query) {
  function quoted(value) {
    return String(value).trim().replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }
  const terms = [];
  if (query.title.trim()) terms.push('recording:"' + quoted(query.title) + '"');
  if (query.artist.trim()) terms.push('artist:"' + quoted(query.artist) + '"');
  if (!terms.length) return [];

  const request = {
    url: "https://musicbrainz.org/ws/2/recording/?query=" + encodeURIComponent(terms.join(" AND ")) + "&fmt=json&limit=10",
    headers: { Accept: "application/json" }
  };
  let response;
  for (let attempt = 0; attempt < 3; attempt++) {
    response = yield request;
    if (response.status !== 429 && response.status !== 503) break;
  }
  if (response.status !== 200) throw new Error("Search failed: " + response.status);
  const data = JSON.parse(response.body);
  const results = [];
  for (const recording of data.recordings || []) {
    const artist = (recording["artist-credit"] || []).map(part => (part.name || "") + (part.joinphrase || "")).join("");
    const releases = recording.releases && recording.releases.length ? recording.releases : [null];
    for (const release of releases) {
      const fields = { TITLE: recording.title || "" };
      if (artist) fields.ARTIST = artist;
      if (release && release.title) fields.ALBUM = release.title;
      if (release && /^\d{4}/.test(release.date || "")) fields.DATE = release.date.slice(0, 4);
      const result = { fields };
      if (release && /^[0-9a-f-]{36}$/i.test(release.id || "")) {
        result.coverUrl = "https://coverartarchive.org/release/" + release.id + "/front";
      }
      results.push(result);
      if (results.length >= 50) return results;
    }
  }
  return results;
}
