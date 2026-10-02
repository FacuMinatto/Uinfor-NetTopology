import { spawn } from 'child_process';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
console.log('Testing app interactions in real Chrome with confirm auto-accept...');

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

      // Auto-accept confirms
      await sendCommand('Runtime.evaluate', {
        expression: 'window.confirm = () => true; window.alert = () => {};'
      });

      // Test 1: Check initial state
      const checkState = await sendCommand('Runtime.evaluate', {
        expression: 'JSON.stringify({ hasApp: !!window.netTopology, nodesCount: window.netTopology.state.nodes.length, sheetsCount: window.netTopology.state.sheets.length })',
        returnByValue: true
      });
      console.log('Test 1 (Initial state):', checkState.result.value);

      // Test 2: Trigger corporate example topology via UI button
      const loadExample = await sendCommand('Runtime.evaluate', {
        expression: `(() => {
          const btn = document.getElementById('btn-example');
          if (btn) btn.click();
          return JSON.stringify({
            nodes: window.netTopology.state.nodes.length,
            connections: window.netTopology.state.connections.length,
            zones: window.netTopology.state.zones.length
          });
        })()`,
        returnByValue: true
      });
      console.log('Test 2 (Load Example result):', loadExample.result.value);

      // Test 3: Select a node and check inspector
      const selectNode = await sendCommand('Runtime.evaluate', {
        expression: `(() => {
          const node = window.netTopology.state.nodes[0];
          if (!node) return 'No nodes';
          window.netTopology.selectElement('node', node.id);
          const inspectorBody = document.getElementById('inspector-body');
          return JSON.stringify({
            selectedId: window.netTopology.state.selection.id,
            inspectorHasContent: inspectorBody ? inspectorBody.innerHTML.length > 50 : false
          });
        })()`,
        returnByValue: true
      });
      console.log('Test 3 (Select node & Inspector):', selectNode.result.value);

      // Test 4: Toggle theme
      const testTheme = await sendCommand('Runtime.evaluate', {
        expression: `(() => {
          const btn = document.getElementById('btn-toggle-theme');
          if (btn) btn.click();
          return document.body.getAttribute('data-theme') || 'dark';
        })()`,
        returnByValue: true
      });
      console.log('Test 4 (Theme toggle result):', testTheme.result.value);

      // Test 5: Verify palette click to create node
      const testPalette = await sendCommand('Runtime.evaluate', {
        expression: `(() => {
          const beforeCount = window.netTopology.state.nodes.length;
          const pcItem = document.querySelector('[data-type=\"pc\"]');
          if (pcItem) pcItem.click();
          return JSON.stringify({
            beforeCount,
            afterCount: window.netTopology.state.nodes.length
          });
        })()`,
        returnByValue: true
      });
      console.log('Test 5 (Palette click create node):', testPalette.result.value);

      ws.close();
      browser.kill();
      process.exit(0);
    };

  } catch (err) {
    console.error('Test error:', err);
    browser.kill();
    process.exit(1);
  }
}, 2000);
