// node test-marks.js — favorites / counters survive removing a library and adding it back (marks.js triggers)
const assert = require('assert');
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE sounds(id INTEGER PRIMARY KEY, lib_id INTEGER, path TEXT UNIQUE, name TEXT,
  fav INTEGER DEFAULT 0, uses INTEGER DEFAULT 0, plays INTEGER DEFAULT 0, last_used REAL);`);
db.exec(require('./marks'));
// the same upsert the scan uses
const ins = db.prepare(`INSERT INTO sounds(lib_id,path,name) VALUES(?,?,?) ON CONFLICT(path) DO UPDATE SET name=excluded.name`);
const get = p => db.prepare('SELECT fav, uses, plays, last_used FROM sounds WHERE path=?').get(p);
ins.run(1, 'D:\\a.wav', 'a'); ins.run(1, 'D:\\b.wav', 'b'); ins.run(1, 'D:\\c.wav', 'c');
db.prepare('UPDATE sounds SET fav=1 WHERE path=?').run('D:\\a.wav');
db.prepare('UPDATE sounds SET uses=2, plays=5, last_used=123 WHERE path=?').run('D:\\b.wav');

db.prepare('DELETE FROM sounds WHERE lib_id=?').run(1); // "remove library"
assert.strictEqual(db.prepare('SELECT count(*) n FROM marks').get().n, 2, 'unmarked c is not parked');

ins.run(7, 'D:\\a.wav', 'a'); ins.run(7, 'D:\\b.wav', 'b'); ins.run(7, 'D:\\c.wav', 'c'); // added back
assert.deepStrictEqual({ ...get('D:\\a.wav') }, { fav: 1, uses: 0, plays: 0, last_used: null });
assert.deepStrictEqual({ ...get('D:\\b.wav') }, { fav: 0, uses: 2, plays: 5, last_used: 123 });
assert.deepStrictEqual({ ...get('D:\\c.wav') }, { fav: 0, uses: 0, plays: 0, last_used: null });
assert.strictEqual(db.prepare('SELECT count(*) n FROM marks').get().n, 0, 'marks are used up');

ins.run(7, 'D:\\a.wav', 'a2'); // rescan of an existing row: marks untouched
assert.strictEqual(get('D:\\a.wav').fav, 1);
console.log('marks.js OK');
