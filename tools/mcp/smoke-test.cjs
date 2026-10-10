const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'artifacts/browser');
fs.mkdirSync(output, { recursive: true });
const child = spawn(process.execPath, [path.join(__dirname, 'node_modules/@playwright/mcp/cli.js'), '--browser', 'msedge', '--headless', '--isolated', '--caps', 'vision', '--output-dir', output], { cwd: root, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
let sequence = 0;
let buffer = '';
let stderr = '';
const pending = new Map();
child.stderr.on('data', data => { stderr += data.toString(); });
function send(message) { child.stdin.write(JSON.stringify(message) + '\n'); }
child.stdout.on('data', data => {
  buffer += data.toString();
  let newline;
  while ((newline = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
    if (!line.trim()) continue;
    const message = JSON.parse(line);
    if (message.id !== undefined && pending.has(message.id)) {
      const { resolve, reject, timer } = pending.get(message.id);
      clearTimeout(timer); pending.delete(message.id);
      message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
    } else if (message.id !== undefined && message.method === 'roots/list') {
      send({ jsonrpc: '2.0', id: message.id, result: { roots: [{ uri: new URL('file:///' + root.replace(/\\/g, '/') + '/').href, name: 'lovely-gift' }] } });
    }
  }
});
function request(method, params) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Timeout: ' + method)); }, 90000);
    pending.set(id, { resolve, reject, timer });
    send({ jsonrpc: '2.0', id, method, params });
  });
}
async function call(name, args) {
  const result = await request('tools/call', { name, arguments: args });
  if (result.isError) throw new Error(JSON.stringify(result.content));
  return result;
}
(async () => {
  try {
    const init = await request('initialize', { protocolVersion: '2024-11-05', capabilities: { roots: { listChanged: false } }, clientInfo: { name: 'lovely-gift-setup-check', version: '1.0.0' } });
    send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    const listing = await request('tools/list', {});
    await call('browser_navigate', { url: 'https://deargift.love/valentine-sweet/gift.php?code=PV6EBD47' });
    await call('browser_take_screenshot', { filename: path.join(output, 'mcp-desktop.png') });
    await call('browser_resize', { width: 390, height: 844 });
    await call('browser_take_screenshot', { filename: path.join(output, 'mcp-mobile.png') });
    await call('browser_close', {});
    const report = { checkedAt: new Date().toISOString(), packageVersion: require('./node_modules/@playwright/mcp/package.json').version, serverInfo: init.serverInfo, toolCount: listing.tools.length, checks: ['initialize', 'tools/list', 'browser_navigate', 'desktop screenshot', 'mobile resize and screenshot', 'browser_close'], status: 'passed' };
    fs.writeFileSync(path.join(output, 'mcp-smoke-test.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(error.message); if (stderr) console.error(stderr.slice(-1500)); process.exitCode = 1;
  } finally { child.kill(); }
})();
