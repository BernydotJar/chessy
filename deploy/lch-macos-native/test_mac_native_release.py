"""Offline contract tests; never call launchd, Docker or real Cloudflare."""
import importlib.util
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

MODULE = Path(__file__).with_name("mac_native_release.py")
SPEC = importlib.util.spec_from_file_location("chessy_lch_macos_installer", MODULE)
MODULE_INSTANCE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE_INSTANCE)
m = MODULE_INSTANCE


class MacNativeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name)
        self.secrets = self.path / "private"
        self.secrets.mkdir(mode=0o700)
        for file, value in {
            "teacher.code": "x" * 30,
            "admin.code": "y" * 40,
            "teachers.json": json.dumps({"version": 1, "teachers": [], "events": []}),
        }.items():
            p = self.secrets / file
            p.write_text(value)
            p.chmod(0o600)
        self.files = {
            "dist/index.html": "<html>Chessy</html>",
            "dist/aula/index.html": '<script src="app.js"></script>',
            "dist/aula/app.js": "console.log('board');",
            "progress/runtime/aula-server.mjs": "console.log('server');",
        }
        self.zip = self.path / "chessy-aula-release.zip"
        self.build_zip()
        self.patches = [
            patch.object(m, "HANDOFF", self.path),
            patch.object(m, "BASE", self.path / "native-home"),
            patch.object(m, "JS_SHA", hashlib.sha256(self.files["dist/aula/app.js"].encode()).hexdigest()),
            patch.object(m, "ARTIFACT_SHA", m.sha(self.zip)),
        ]
        for item in self.patches:
            item.start()
            self.addCleanup(item.stop)

    def build_zip(self):
        with zipfile.ZipFile(self.zip, "w") as z:
            for name, value in self.files.items():
                z.writestr(name, value)

    def test_valid_archive_stages_and_migrates_secret_permissions(self):
        release, secrets = m.prepare()
        self.assertEqual(m.sha(release / "dist/aula/app.js"), m.JS_SHA)
        self.assertTrue((release / "server.mjs").is_file())
        for filename in ["teacher.code", "admin.code", "teachers.json"]:
            self.assertEqual((secrets / filename).stat().st_mode & 0o777, 0o600)
        self.assertEqual(m.prepare(), (release, secrets))

    def test_refuses_mismatched_teacher_registry(self):
        m.prepare()
        (self.secrets / "teachers.json").write_text(
            json.dumps({"version": 1, "teachers": [{"id": "new"}], "events": []}))
        (self.secrets / "teachers.json").chmod(0o600)
        with self.assertRaisesRegex(RuntimeError, "differs"):
            m.prepare()

    def test_old_room_check_uses_local_caddy_origin(self):
        calls = []
        def mocked_curl(url, timeout=10, host_header=None):
            calls.append((url, host_header))
            self.assertTrue(url.startswith("http://127.0.0.1:8080/"))
            self.assertEqual(host_header, "chessy.textilesdemedellin.com")
            if url == "http://127.0.0.1:8080/health":
                return json.dumps({"status": "ok", "product": "chessy", "release_sha": m.RELEASE}).encode()
            return json.dumps({"status": "ok", "backendReady": True, "roomsActive": 0}).encode()
        with patch.object(m, "curl_data", side_effect=mocked_curl):
            m.check_old_rooms()
        self.assertEqual(len(calls), 2)

    def test_old_room_check_rejects_active_rooms_and_wrong_release(self):
        for bad_type in ("active", "wrong-sha", "invalid-count"):
            with self.subTest(bad_type=bad_type):
                def mocked_curl(url, timeout=10, host_header=None):
                    if url == "http://127.0.0.1:8080/health":
                        value = {"status": "ok", "product": "chessy", "release_sha": m.RELEASE}
                        if bad_type == "wrong-sha":
                            value["release_sha"] = "b" * 40
                    else:
                        value = {"status": "ok", "backendReady": True, "roomsActive": 0}
                        if bad_type == "active":
                            value["roomsActive"] = 1
                        if bad_type == "invalid-count":
                            value["roomsActive"] = False
                    return json.dumps(value).encode()
                with patch.object(m, "curl_data", side_effect=mocked_curl):
                    with self.assertRaises(RuntimeError):
                        m.check_old_rooms()

    def test_rejects_traversal_archive(self):
        self.files["dist/../../../escape"] = "escape"
        self.build_zip()
        with patch.object(m, "ARTIFACT_SHA", m.sha(self.zip)):
            with self.assertRaisesRegex(ValueError, "unsafe ZIP"):
                m.validate_bundle(self.zip)

    def test_rejects_bad_artifact_checksum(self):
        with patch.object(m, "ARTIFACT_SHA", "0" * 64):
            with self.assertRaisesRegex(ValueError, "SHA-256 mismatch"):
                m.validate_bundle(self.zip)

    def test_rejects_overpermissive_staged_secret(self):
        (self.secrets / "teacher.code").chmod(0o644)
        with self.assertRaisesRegex(ValueError, "Unsafe staged permissions"):
            m.check_staged_secrets(self.secrets)


if __name__ == '__main__':
    unittest.main()
