import { spawn } from 'child_process';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--disable-gpu',
  '--no-sandbox',
  'http://127.0.0.1:3000/'
]);

setTimeout(async () => {
  try {
    const listRes = await fetch('http://127.0.0.1:9222/json/list');
    const tabs = await listRes.json();
    const tab = tabs.find(t => t.url.includes('127.0.0.1:3000') || t.url.includes('localhost:3000')) || tabs[0];
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    let id = 1;
    function exec(expr) {
      return new Promise((resolve) => {
        const curId = id++;
        const handler = (e) => {
          const d = JSON.parse(e.data);
          if (d.id === curId) {
            ws.removeEventListener('message', handler);
            resolve(d.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({
          id: curId,
          method: 'Runtime.evaluate',
          params: { expression: expr, returnByValue: true, awaitPromise: true }
        }));
      });
    }

    ws.onopen = async () => {
      // Allow IndexedDB and save a project
      const result = await exec(`
        (async () => {
          window.netTopology.loadDefaultTopology();
          window.netTopology.saveStateImmediately();
          // Wait 300ms for IndexedDB write
          await new Promise(r => setTimeout(r, 400));
          const dbs = await indexedDB.databases();
          const { dbStore } = await import('/src/storage/db.js');
          const projects = await dbStore.getItem('projects_collection');
          return JSON.stringify({
            databases: dbs.map(d => d.name),
            projectsInIndexedDB: Array.isArray(projects) ? projects.length : 0,
            projectName: projects && projects[0] ? projects[0].name : null,
            nodesCount: projects && projects[0] ? projects[0].nodes.length : 0
          });
        })()
      `);

      console.log('IndexedDB Verification Result:', result.value);
      ws.close();
      browser.kill();
      process.exit(0);
    };
  } catch (err) {
    console.error('Error:', err);
    browser.kill();
    process.exit(1);
  }
}, 2000);
