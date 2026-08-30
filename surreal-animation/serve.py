#!/usr/bin/env python3
"""Tiny static file server with HTTP Range support (so <video> seeking works).
Serves the surreal-animation directory. Usage: python3 serve.py [port]"""
import http.server, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
TYPES = {'.html': 'text/html', '.mp4': 'video/mp4', '.png': 'image/png',
         '.wav': 'audio/wav', '.js': 'text/javascript', '.css': 'text/css',
         '.md': 'text/plain'}


class Handler(http.server.BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def _resolve(self):
        name = self.path.split('?')[0].split('#')[0]
        if name == '/':
            name = '/index.html'
        path = os.path.normpath(os.path.join(ROOT, name.lstrip('/')))
        if not path.startswith(ROOT) or not os.path.isfile(path):
            return None
        return path

    def _headers(self, path, status, start, end):
        size = os.path.getsize(path)
        ctype = TYPES.get(os.path.splitext(path)[1], 'application/octet-stream')
        self.send_response(status)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(end - start + 1))
        self.send_header('Accept-Ranges', 'bytes')
        if status == 206:
            self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.end_headers()

    def do_HEAD(self):
        path = self._resolve()
        if not path:
            self.send_error(404)
            return
        self._headers(path, 200, 0, os.path.getsize(path) - 1)

    def do_GET(self):
        path = self._resolve()
        if not path:
            self.send_error(404)
            return
        size = os.path.getsize(path)
        start, end, status = 0, size - 1, 200
        rng = self.headers.get('Range')
        if rng:
            m = re.match(r'bytes=(\d*)-(\d*)$', rng.strip())
            if m and (m.group(1) or m.group(2)):
                status = 206
                if m.group(1):
                    start = int(m.group(1))
                    end = min(int(m.group(2)), size - 1) if m.group(2) else size - 1
                else:                       # suffix range: bytes=-N
                    start = max(0, size - int(m.group(2)))
        self._headers(path, status, start, end)
        with open(path, 'rb') as f:
            f.seek(start)
            remaining = end - start + 1
            while remaining > 0:
                chunk = f.read(min(1 << 16, remaining))
                if not chunk:
                    break
                try:
                    self.wfile.write(chunk)
                except BrokenPipeError:
                    return
                remaining -= len(chunk)

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    srv = http.server.ThreadingHTTPServer(('0.0.0.0', PORT), Handler)
    print(f'serving {ROOT} on 0.0.0.0:{PORT}')
    srv.serve_forever()
