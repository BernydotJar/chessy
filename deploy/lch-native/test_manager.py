"""Offline contracts for the LCH release staging and stateful classroom gates."""
import importlib.util
import json
import shutil
import stat
import tempfile
import threading
import unittest
import zipfile
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("manager.py")
SPEC = importlib.util.spec_from_file_location("chessy_lch_manager", MODULE_PATH)
manager = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(manager)
SHA = "a" * 40


class Handler(BaseHTTPRequestHandler):
    rooms = 0
    release = SHA

    def do_GET(self):
        if self.path == "/health":
            data = {"status": "ok", "release_sha": self.release}
        elif self.path == "/aula/api/health":
            data = {"status": "ok", "backendReady": True, "roomsActive": self.rooms}
        else:
            self.send_error(404)
            return
        payload = json.dumps(data).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *args):
        pass


class MigrationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.server = HTTPServer(("127.0.0.1", 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)
        self.origin = "http://127.0.0.1:" + str(self.server.server_address[1])
        Handler.rooms = 0
        Handler.release = SHA

    def test_room_occupancy_blocks_cutover(self):
        manager.check_rooms_empty(self.origin)
        Handler.rooms = 1
        with self.assertRaisesRegex(RuntimeError, "Active classroom sessions"):
            manager.check_rooms_empty(self.origin)

    def test_sha_mismatch_is_rejected(self):
        manager.check_release(self.origin, SHA)
        with self.assertRaisesRegex(RuntimeError, "Unexpected Chessy release"):
            manager.check_release(self.origin, "b" * 40)

    def test_path_traversal_is_rejected(self):
        for name in ("dist/../../secrets", "/etc/passwd", "other-app/index.html"):
            self.assertFalse(manager.is_safe_entry(zipfile.ZipInfo(name)))

    def test_symlink_zip_entry_is_rejected(self):
        item = zipfile.ZipInfo("dist/aula/fake")
        item.create_system = 3
        item.external_attr = (stat.S_IFLNK | 0o777) << 16
        self.assertFalse(manager.is_safe_entry(item))

    @unittest.skipUnless(shutil.which("node"), "Requires Node.js for script syntax validation")
    def test_immutable_artifact_staging_and_checksum(self):
        zip_path = self.root / "valid.zip"
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as z:
            z.writestr("dist/index.html", "<html>Chessy</html>")
            z.writestr("dist/aula/index.html", '<script src="/aula/app.js"></script>')
            z.writestr("dist/aula/app.js", "console.log('Chessy classroom');")
            z.writestr("progress/runtime/aula-server.mjs", "console.log('Chessy server');")
        expected = manager.digest(zip_path.read_bytes())
        result = manager.stage(zip_path, SHA, expected, self.root)
        self.assertEqual(result, self.root / "releases" / SHA)
        manifest = json.loads((result / "release-manifest.json").read_text())
        self.assertEqual(manifest["release_sha"], SHA)
        self.assertEqual(manifest["artifact_sha256"], expected)
        self.assertTrue((result / "server.mjs").is_file())
        self.assertEqual(manager.stage(zip_path, SHA, expected, self.root), result)
        with self.assertRaisesRegex(RuntimeError, "Artifact SHA-256 mismatch"):
            manager.stage(zip_path, "b" * 40, "0" * 64, self.root)

    def test_link_swaps_atomically(self):
        releases = self.root / "releases"
        old = releases / ("a" * 40)
        new = releases / ("b" * 40)
        old.mkdir(parents=True)
        new.mkdir(parents=True)
        manager.swap_link(self.root, old)
        self.assertEqual((self.root / "current").resolve(), old)
        manager.swap_link(self.root, new)
        self.assertEqual((self.root / "current").resolve(), new)


if __name__ == "__main__":
    unittest.main()
