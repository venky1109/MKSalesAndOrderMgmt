const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const PORT = Number(process.env.LABEL_PRINTER_PORT || 8765);
const HOST = process.env.LABEL_PRINTER_HOST || '127.0.0.1';
const PRINTER_SHARE = process.env.LABEL_PRINTER_SHARE || 'TSC_TE244';
const PRINTER_PATH =
  process.env.LABEL_PRINTER_PATH || `\\\\localhost\\${PRINTER_SHARE}`;

const sendJson = (res, status, body) => {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  });
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;

      if (body.length > 8 * 1024 * 1024) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });

    req.on('end', () => resolve(body));
    req.on('error', reject);
  });

const copyRawToPrinter = (filePath) =>
  new Promise((resolve, reject) => {
    execFile(
      'cmd.exe',
      ['/c', 'copy', '/B', filePath, PRINTER_PATH],
      { windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              stderr ||
                stdout ||
                `Unable to copy raw label to printer ${PRINTER_PATH}`
            )
          );
          return;
        }

        resolve(stdout);
      }
    );
  });

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, {
      ok: true,
      printerPath: PRINTER_PATH,
    });
    return;
  }

  if (req.method !== 'POST' || req.url !== '/print-label') {
    sendJson(res, 404, { ok: false, message: 'Not found' });
    return;
  }

  let tempFile = '';

  try {
    const rawBody = await readBody(req);
    const payload = JSON.parse(rawBody || '{}');
    const prnBase64 = String(payload.prnBase64 || '');
    const prn = String(payload.prn || '');
    const printData = prnBase64 ? Buffer.from(prnBase64, 'base64') : Buffer.from(prn, 'utf8');

    if (!printData.length || (!prnBase64 && !prn.trim())) {
      sendJson(res, 400, { ok: false, message: 'Missing PRN data' });
      return;
    }

    tempFile = path.join(
      os.tmpdir(),
      `mk-label-${Date.now()}-${Math.round(Math.random() * 100000)}.prn`
    );

    fs.writeFileSync(tempFile, printData);
    await copyRawToPrinter(tempFile);

    sendJson(res, 200, {
      ok: true,
      message: 'Label sent to printer',
      printerPath: PRINTER_PATH,
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      message: error.message || 'Label print failed',
      printerPath: PRINTER_PATH,
    });
  } finally {
    if (tempFile) {
      try {
        fs.unlinkSync(tempFile);
      } catch {
        // Temporary file cleanup is best effort.
      }
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`ManaKirana local label printer running at http://${HOST}:${PORT}`);
  console.log(`Printer path: ${PRINTER_PATH}`);
  console.log('Set LABEL_PRINTER_SHARE if your Windows printer share name differs.');
});
