// ExtendScript (ES3) side of the SFX Library bridge. Loaded via <ScriptPath>, called from index.html.
// sfxSwap(json): for every audio clip on the active sequence whose media is one of the region clips
// SFX Library just rendered, put the ORIGINAL file in its place with source in/out = the region.
// The timeline clip then looks the same but can be extended back to the whole sound.

function sfxNorm(p) { return String(p).replace(/\\/g, '/').toLowerCase(); }

function sfxFind(bin, want) {
  for (var i = 0; i < bin.children.numItems; i++) {
    var c = bin.children[i];
    if (c.type === ProjectItemType.BIN) { var r = sfxFind(c, want); if (r) return r; }
    else { try { if (sfxNorm(c.getMediaPath()) === want) return c; } catch (e) {} }
  }
  return null;
}

function sfxOriginal(path) {
  var want = sfxNorm(path), item = sfxFind(app.project.rootItem, want);
  if (!item) {
    app.project.importFiles([path], true, app.project.getInsertionBin(), false);
    item = sfxFind(app.project.rootItem, want);
  }
  return item;
}

function sfxSwap(json) {
  var jobs = eval('(' + json + ')'), seq = app.project.activeSequence, done = [];
  if (!seq) return '[]';
  for (var t = 0; t < seq.audioTracks.numTracks; t++) {
    var track = seq.audioTracks[t];
    for (var k = track.clips.numItems - 1; k >= 0; k--) {
      var clip = track.clips[k], pi = clip.projectItem, media;
      if (!pi) continue;
      try { media = sfxNorm(pi.getMediaPath()); } catch (e) { continue; }
      for (var j = 0; j < jobs.length; j++) {
        if (media !== sfxNorm(jobs[j].clip)) continue;
        var orig = sfxOriginal(jobs[j].orig);
        if (!orig) break;
        // keep any trim already made on the clip: its in/out are relative to the region file
        var at = clip.start.seconds, a = jobs[j].start + clip.inPoint.seconds, b = jobs[j].start + clip.outPoint.seconds;
        orig.setInPoint(a, 4); orig.setOutPoint(b, 4); // 4 = all media types
        clip.remove(false, false);
        track.overwriteClip(orig, at);
        try { orig.clearInPoint(4); orig.clearOutPoint(4); } catch (e) {}
        done.push('"' + String(jobs[j].clip).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"');
        break;
      }
    }
  }
  return '[' + done.join(',') + ']';
}
