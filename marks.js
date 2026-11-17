// A sound's favorite / use / play marks outlive its row: removing a library (or a file going missing for a while)
// deletes the rows, and adding the folder back used to bring every sound back unmarked. The marks are parked
// by path when a row goes and put back when a row with that path comes again.
module.exports = `
  CREATE TABLE IF NOT EXISTS marks(path TEXT PRIMARY KEY, fav INTEGER, uses INTEGER, plays INTEGER, last_used REAL);
  CREATE TRIGGER IF NOT EXISTS s_keep BEFORE DELETE ON sounds WHEN old.fav OR old.uses OR old.plays BEGIN
    INSERT OR REPLACE INTO marks VALUES(old.path, old.fav, old.uses, old.plays, old.last_used); END;
  CREATE TRIGGER IF NOT EXISTS s_back AFTER INSERT ON sounds WHEN EXISTS(SELECT 1 FROM marks WHERE path=new.path) BEGIN
    UPDATE sounds SET (fav, uses, plays, last_used) = (SELECT fav, uses, plays, last_used FROM marks WHERE path=new.path) WHERE id=new.id;
    DELETE FROM marks WHERE path=new.path; END;
`;
