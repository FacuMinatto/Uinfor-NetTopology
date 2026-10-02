import { spawn } from 'child_process';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
console.log('Capturing Collab modal screenshot in Chrome...');

const browser = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--disable-gpu',
  '--no-sandbox',
  '--window-size=1440,900',
  'http://localhost:3000/'
]);

setTimeout(async () => {
  try {
    const listRes = await fetch('http://127.0.0.1:9222/json/list');
    const tabs = await listRes.json();
    const tab = tabs.find(t => t.url.includes('localhost:3000')) || tabs[0];
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    let msgId = 1;
    function sendCommand(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        const handler = (event) => {
          const res = JSON.parse(event.data);
          if (res.id === id) {
            ws.removeEventListener('message', handler);
            resolve(res.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onopen = async () => {
      await sendCommand('Page.enable');
      await sendCommand('Runtime.enable');
      await new Promise(r => setTimeout(r, 1000));

      // Click "Colaborar" button
      await sendCommand('Runtime.evaluate', {
        expression: "document.getElementById('btn-collab-trigger').click()"
      });
      await new Promise(r => setTimeout(r, 500));

      const screenshot = await sendCommand('Page.captureScreenshot', { format: 'png' });
      const buffer = Buffer.from(screenshot.data, 'base64');
      
      const outPath = 'C:/Users/facum/.gemini/antigravity-ide/brain/7f89ecf0-174f-4cb9-b7d5-cdc167bd3e46/screenshot_collab_modal.png';
      fs.writeFileSync(outPath, buffer);
      console.log('Collab modal screenshot saved to:', outPath);

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
