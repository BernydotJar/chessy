import unittest
from lch_route import update_ingress


class IngressTests(unittest.TestCase):
    def test_inserts_before_wildcard_without_changing_luma(self):
        src = """tunnel: existing
ingress:
  - hostname: '*.lch-app.cloud'
    service: http://localhost:8080
  - service: http_status:404
"""
        out = update_ingress(src)
        self.assertLess(out.index("hostname: chessy.lch-app.cloud"), out.index("hostname: '*.lch-app.cloud'"))
        self.assertIn("service: http://localhost:8080", out)
        self.assertIn("httpHostHeader: chessy.lch-app.cloud", out)
        self.assertEqual(update_ingress(out), out)

    def test_changes_only_existing_chessy_entry(self):
        src = """tunnel: shared
ingress:
  - hostname: luma.lch-app.cloud
    service: http://localhost:8080
  - hostname: chessy.lch-app.cloud
    service: http://localhost:8080
    originRequest:
      httpHostHeader: chessy.lch-app.cloud
  - hostname: meridian.lch-app.cloud
    service: http://localhost:8080
  - service: http_status:404
"""
        out = update_ingress(src)
        self.assertEqual(out.count("- hostname: chessy.lch-app.cloud"), 1)
        self.assertIn("service: http://127.0.0.1:14178", out)
        self.assertIn("hostname: luma.lch-app.cloud\n    service: http://localhost:8080", out)
        self.assertIn("hostname: meridian.lch-app.cloud\n    service: http://localhost:8080", out)
        self.assertEqual(update_ingress(out), out)

    def test_rejects_duplicate_hosts(self):
        src = """ingress:
  - hostname: chessy.lch-app.cloud
    service: http://localhost:8080
  - hostname: chessy.lch-app.cloud
    service: http://localhost:8080
  - service: http_status:404
"""
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            update_ingress(src)

    def test_requires_terminal_fallback(self):
        src = """ingress:
  - hostname: luma.lch-app.cloud
    service: http://localhost:8080
"""
        with self.assertRaisesRegex(ValueError, "terminal"):
            update_ingress(src)


if __name__ == '__main__':
    unittest.main()
