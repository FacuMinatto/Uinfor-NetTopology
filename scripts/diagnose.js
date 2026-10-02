import { spawn } from 'child_process';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
console.log('Running deep diagnostic on http://localhost:3000/...');

const browser = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--disable-gpu',
  '--no-sandbox',
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

    const consoleLogs = [];
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.exceptionThrown') {
        consoleLogs.push({ type: 'EXCEPTION', data: msg.params.exceptionDetails });
      } else if (msg.method === 'Console.messageAdded') {
        consoleLogs.push({ type: 'CONSOLE', level: msg.params.message.level, text: msg.params.message.text });
      }
    };

    ws.onopen = async () => {
      await sendCommand('Runtime.enable');
      await sendCommand('Console.enable');
      await sendCommand('Log.enable');

      // Wait 1s for initial render
      await new Promise(r => setTimeout(r, 1000));

      const diag = await sendCommand('Runtime.evaluate', {
        expression: `(() => {
          const s = window.netTopology?.state;
          const domNodes = document.querySelectorAll('.network-node');
          const domCables = document.querySelectorAll('.network-cable');
          const domZones = document.querySelectorAll('.network-zone');
          const modalCollab = document.getElementById('modal-collab');
          const paletteItems = document.querySelectorAll('.palette-item');
          
          return {
            nodesCount: s?.nodes?.length,
            connectionsCount: s?.connections?.length,
            zonesCount: s?.zones?.length,
            sheetsCount: s?.sheets?.length,
            activeSheetId: s?.activeSheetId,
            viewport: s?.viewport,
            domNodesRendered: domNodes.length,
            domCablesRendered: domCables.length,
            domZonesRendered: domZones.length,
            paletteItemsFound: paletteItems.length,
            collabModalClass: modalCollab?.className,
            collabModalDisplay: modalCollab ? window.getComputedStyle(modalCollab).display : null,
            collabModalPosition: modalCollab ? window.getComputedStyle(modalCollab).position : null,
            collabModalZIndex: modalCollab ? window.getComputedStyle(modalCollab).zIndex : null,
            collabModalPointerEvents: modalCollab ? window.getComputedStyle(modalCollab).pointerEvents : null,
            nodesLayerChildren: document.getElementById('nodes-layer')?.children.length,
            viewportBounds: document.getElementById('viewport')?.getBoundingClientRect(),
          };
        })()`,
        returnByValue: true
      });

      console.log('Diagnostic result:\n', JSON.stringify(diag.result.value, null, 2));
      console.log('Console logs count:', consoleLogs.length);
      if (consoleLogs.length > 0) {
        console.log('Console logs:', JSON.stringify(consoleLogs, null, 2));
      }

      ws.close();
      browser.kill();
      process.exit(0);
    };
  } catch (err) {
    console.error('Error running diagnostic:', err);
    browser.kill();
    process.exit(1);
  }
}, 2000);
