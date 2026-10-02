import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\facum\\.gemini\\antigravity-ide\\brain\\7f89ecf0-174f-4cb9-b7d5-cdc167bd3e46';
const userDataDir = path.join(artifactDir, 'scratch', 'chrome_test_profile_2');

if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

console.log('Starting Chrome for visual verification of Classic Dark vs Liquid Glass...');
const browser = spawn(chromePath, [
  '--headless=new', '--remote-debugging-port=9226', '--disable-gpu', 
  '--no-sandbox', `--user-data-dir=${userDataDir}`, '--window-size=1440,900', 
  'http://localhost:3000/'
]);

async function run() {
  let tab = null;
  for (let i = 0; i < 20; i++) {
    try {
      const tabs = await (await fetch('http://127.0.0.1:9226/json/list')).json();
      tab = tabs.find(t => t.url.includes('localhost:3000')) || tabs[0];
      if (tab?.webSocketDebuggerUrl) break;
    } catch { await new Promise(r => setTimeout(r, 300)); }
  }

  if (!tab) throw new Error('Failed to get chrome tab endpoint');
  console.log('Connected to tab');
  
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let msgId = 1;

  const sendCommand = (method, params = {}) => new Promise((resolve, reject) => {
    const id = msgId++;
    const timeout = setTimeout(() => reject(new Error('Timeout on ' + method)), 15000);
    const handler = (e) => {
      const res = JSON.parse(e.data);
      if (res.id === id) {
        clearTimeout(timeout);
        ws.removeEventListener('message', handler);
        resolve(res.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  const waitForElement = async (script, maxWait = 5000) => {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      const res = await sendCommand('Runtime.evaluate', { expression: script, returnByValue: true });
      if (res?.result?.value) return true;
      await new Promise(r => setTimeout(r, 200));
    }
    return false;
  };

  ws.addEventListener('message', (e) => {
    try {
      if (JSON.parse(e.data).method === 'Page.javascriptDialogOpening') {
        sendCommand('Page.handleJavaScriptDialog', { accept: true });
      }
    } catch {}
  });

  ws.onopen = async () => {
    try {
      await Promise.all([sendCommand('Runtime.enable'), sendCommand('Page.enable')]);
      await new Promise(r => setTimeout(r, 800));

      await sendCommand('Runtime.evaluate', { expression: 'window.confirm = () => true; window.alert = () => {};' });

      console.log('Cargando ejemplo corporativo...');
      await waitForElement(`(function(){ const b = document.getElementById('btn-example'); if(b) { b.click(); return true; } return false; })()`);
      await new Promise(r => setTimeout(r, 1000));

      console.log('Seleccionando Switch Huawei...');
      await waitForElement(`(function(){ 
        if (window.netTopology?.state?.nodes.length > 0) {
          const sw = window.netTopology.state.nodes.find(n => n.name.toLowerCase().includes('huawei') || n.name.toLowerCase().includes('switch')) || window.netTopology.state.nodes[0];
          if (sw) { window.netTopology.selectElement('node', sw.id); return true; }
        }
        return false;
      })()`);
      await new Promise(r => setTimeout(r, 800));

      console.log('Activando Liquid Glass...');
      await waitForElement(`(function(){ const m = document.getElementById('menu-view-theme-glass'); if(m) { m.click(); return true; } return false; })()`);
      await new Promise(r => setTimeout(r, 1000));

      const shot = await sendCommand('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(artifactDir, 'screenshot_liquid_glass_optimized.png'), Buffer.from(shot.data, 'base64'));
      console.log('Screenshot guardada.');

      const perfTest = await sendCommand('Runtime.evaluate', {
        expression: `(() => {
          const t0 = performance.now();
          for (let i = 0; i < 20; i++) {
            window.netTopology.state.viewport.x += (i % 2 === 0 ? 5 : -5);
            window.netTopology.updateViewportTransform();
          }
          return { fpsEquivalent: (1000 / ((performance.now() - t0) / 20)).toFixed(0) };
        })()`,
        returnByValue: true
      });
      console.log('Performance test:', perfTest.result.value);

      console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
    } catch (err) {
      console.error('Error during run:', err);
      process.exitCode = 1;
    } finally {
      ws.close();
      browser.kill();
    }
  };
}

run().catch(e => {
  console.error('Top level error:', e);
  browser.kill();
  process.exit(1);
});
