// Runs after `next build` (npm "postbuild").
//
// On Windows, Next's static export writes prefetch data to
// out/my-swings/__next.my-swings/__PAGE__.txt, because it only converts "/" to "."
// and Windows paths use "\". The client router requests the flat name,
// out/my-swings/__next.my-swings.__PAGE__.txt, and gets a 404.
//
// Other platforms already produce the flat name, so this does nothing there.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SEGMENT_DIR_PREFIX = '__next.';
const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'out');

function flattenSegmentDir(segmentDir, flatPrefix) {
  for (const entry of fs.readdirSync(segmentDir, { withFileTypes: true })) {
    const entryPath = path.join(segmentDir, entry.name);
    const flatName = `${flatPrefix}.${entry.name}`;
    if (entry.isDirectory()) {
      flattenSegmentDir(entryPath, flatName);
    } else {
      fs.renameSync(entryPath, flatName);
    }
  }
  fs.rmdirSync(segmentDir);
}

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === '_next') continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.name.startsWith(SEGMENT_DIR_PREFIX)) {
      flattenSegmentDir(entryPath, entryPath);
    } else {
      walk(entryPath);
    }
  }
}

if (fs.existsSync(outDir)) {
  walk(outDir);
}
