import { spawn } from 'child_process';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
console.log('Testing Collab UI interactions in Chrome with exact IDs...');

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

      // Test: Click Collab Trigger button and check modal visibility
      const testModal = await sendCommand('Runtime.evaluate', {
        expression: `(() => {
          const trigger = document.getElementById('btn-collab-trigger');
          if (!trigger) return { error: 'Trigger button not found' };
          trigger.click();
          const modal = document.getElementById('modal-collab');
          const isVisible = modal && modal.classList.contains('open');
          const createBtn = document.getElementById('btn-collab-create-room');
          const joinBtn = document.getElementById('btn-collab-join-room');
          const copyBtn = document.getElementById('btn-collab-copy-code');
          const userInput = document.getElementById('input-collab-username');
          const roomInput = document.getElementById('input-collab-room-code');
          return {
            triggerFound: !!trigger,
            modalVisible: isVisible,
            hasCreateBtn: !!createBtn,
            hasJoinBtn: !!joinBtn,
            hasCopyBtn: !!copyBtn,
            userInputValue: userInput ? userInput.value : null,
            roomInputPlaceholder: roomInput ? roomInput.placeholder : null,
            collabState: window.netTopology?.state?.collab
          };
        })()`,
        returnByValue: true
      });
      console.log('Collab UI Test Result:', JSON.stringify(testModal.result.value, null, 2));

      // Test closing modal
      const testClose = await sendCommand('Runtime.evaluate', {
        expression: `(() => {
          const closeBtn = document.getElementById('btn-close-collab-modal');
          if (closeBtn) closeBtn.click();
          const modal = document.getElementById('modal-collab');
          return { modalOpen: modal ? modal.classList.contains('open') : null };
        })()`,
        returnByValue: true
      });
      console.log('Collab Modal Close Result:', JSON.stringify(testClose.result.value, null, 2));

      ws.close();
      browser.kill();
      process.exit(0);
    };
  } catch (err) {
    console.error('Error running collab test:', err);
    browser.kill();
    process.exit(1);
  }
}, 2000);
