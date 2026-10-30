/* DM Validator worker: parses and checks the file off the main thread and serves the tree lazily. */
importScripts('engine.js');
let doc = null, idx = null, schema = null;

self.onmessage = (e) => {
  const m = e.data;
  try {
    if (m.type === 'schema') { schema = m.schema; return; }
    if (m.type === 'check') {
      doc = null; idx = null;
      const t0 = performance.now();
      idx = DMV.lineIndex(m.text);
      try {
        doc = DMV.parse(m.text);
      } catch (err) {
        if (err instanceof DMV.SyntaxIssue) {
          self.postMessage({ type: 'syntax', id: m.id, code: err.code, line: err.line, col: err.col, detail: err.detail, lines: idx.length + 1 });
          return;
        }
        throw err;
      }
      const t1 = performance.now();
      const res = DMV.resolve(DMV.validate(doc, schema), idx);
      const rootKids = DMV.children(doc, [], 0, 500, idx);
      self.postMessage({ type: 'result', id: m.id, msgs: res.msgs, variants: res.variants, lines: res.lines,
        root: rootKids, ms: { parse: Math.round(t1 - t0), check: Math.round(performance.now() - t1) } });
      return;
    }
    if (m.type === 'children') {
      self.postMessage({ type: 'children', req: m.req, segs: m.segs, from: m.from, res: DMV.children(doc, m.segs, m.from, m.count, idx) });
      return;
    }
  } catch (err) {
    self.postMessage({ type: 'fatal', id: m.id, message: String(err && err.message || err) });
  }
};
