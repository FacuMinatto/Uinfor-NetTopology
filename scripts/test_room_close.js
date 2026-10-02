import { spawn } from 'child_process';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
console.log('Testing Room Closing workflow in Chrome...');

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

    ws.onopen = async () => {
      await sendCommand('Runtime.enable');
      await sendCommand('Page.enable');

      // Auto-accept confirm dialogs
      await sendCommand('Runtime.evaluate', {
        expression: 'window.confirm = () => true;'
      });

      // 1. Open Collab Modal
      await sendCommand('Runtime.evaluate', {
        expression: "document.getElementById('btn-collab-trigger').click()"
      });
      await new Promise(r => setTimeout(r, 400));

      // 2. Click "Crear Sala"
      await sendCommand('Runtime.evaluate', {
        expression: "document.getElementById('btn-collab-create-room').click()"
      });
      // Wait for PeerJS to connect
      await new Promise(r => setTimeout(r, 2000));

      const afterCreate = await sendCommand('Runtime.evaluate', {
        expression: `(() => {
          const leaveBtn = document.getElementById('btn-collab-leave');
          const codeDisp = document.getElementById('collab-room-code-display');
          return {
            leaveBtnText: leaveBtn ? leaveBtn.textContent : null,
            roomCode: codeDisp ? codeDisp.textContent : null,
            active: window.netTopology?.state?.collab?.active
          };
        })()`,
        returnByValue: true
      });
      console.log('After Create Room:', JSON.stringify(afterCreate.result.value, null, 2));

      // 3. Click "Cerrar Sala"
      await sendCommand('Runtime.evaluate', {
        expression: "document.getElementById('btn-collab-leave').click()"
      });
      await new Promise(r => setTimeout(r, 500));

      const afterClose = await sendCommand('Runtime.evaluate', {
        expression: `(() => {
          const toasts = Array.from(document.querySelectorAll('.net-toast')).map(t => t.textContent);
          const modal = document.getElementById('modal-collab');
          return {
            toasts: toasts,
            modalOpen: modal ? modal.classList.contains('open') : null,
            active: window.netTopology?.state?.collab?.active
          };
        })()`,
        returnByValue: true
      });
      console.log('After Close Room:', JSON.stringify(afterClose.result.value, null, 2));

      ws.close();
      browser.kill();
      process.exit(0);
    };
  } catch (err) {
    console.error('Error running test:', err);
    browser.kill();
    process.exit(1);
  }
}, 2000);
