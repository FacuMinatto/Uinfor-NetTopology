import { spawn } from 'child_process';
import http from 'http';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browserExe = chromePath;

console.log('Starting browser to inspect console errors...');
const browser = spawn(browserExe, [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--disable-gpu',
  '--no-sandbox',
  'http://localhost:3000/'
]);

// Wait 2 seconds for browser to open port 9222
setTimeout(async () => {
  try {
    const listRes = await fetch('http://127.0.0.1:9222/json/list');
    const tabs = await listRes.json();
    console.log('Tabs open:', tabs.length);
    const tab = tabs.find(t => t.url.includes('localhost:3000')) || tabs[0];
    if (!tab || !tab.webSocketDebuggerUrl) {
      console.error('No debugger tab found:', tabs);
      browser.kill();
      process.exit(1);
    }

    console.log('Connecting to WebSocket:', tab.webSocketDebuggerUrl);
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    ws.onopen = () => {
      // Enable Runtime and Console
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Console.enable' }));
      ws.send(JSON.stringify({ id: 3, method: 'Log.enable' }));
      // Reload page to capture startup errors
      ws.send(JSON.stringify({ id: 4, method: 'Page.reload' }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('\n>>> RUNTIME EXCEPTION:');
        console.error(msg.params.exceptionDetails.text);
        if (msg.params.exceptionDetails.exception) {
          console.error(msg.params.exceptionDetails.exception.description);
        }
        console.error('URL:', msg.params.exceptionDetails.url);
        console.error('Line:', msg.params.exceptionDetails.lineNumber, 'Col:', msg.params.exceptionDetails.columnNumber);
      } else if (msg.method === 'Console.messageAdded') {
        console.log('[BROWSER CONSOLE]', msg.params.message.level, msg.params.message.text);
      } else if (msg.method === 'Runtime.consoleAPICalled') {
        const args = (msg.params.args || []).map(a => a.value || a.description).join(' ');
        console.log('[CONSOLE API]', msg.params.type, args);
      }
    };

    setTimeout(() => {
      console.log('\nFinished 5s listening.');
      ws.close();
      browser.kill();
      process.exit(0);
    }, 5000);

  } catch (err) {
    console.error('Error connecting to browser debugger:', err);
    browser.kill();
    process.exit(1);
  }
}, 2000);
