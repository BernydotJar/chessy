"""Minimal, fail-closed edit of only the Chessy LCH host in cloudflared config."""
import re

HOST = "chessy.lch-app.cloud"
ORIGIN = "http://127.0.0.1:14178"


def update_ingress(source: str) -> str:
    lines = source.splitlines(keepends=True)
    idx = [i for i, line in enumerate(lines) if re.match(r"^ingress:\s*(?:#.*)?\n?$", line)]
    if len(idx) != 1:
        raise ValueError("Expected exactly one cloudflared ingress block")
    start = idx[0]
    # Support standard cloudflared YAML, where service entries are indented
    # beneath ingress and the terminal HTTP 404 rule stays in place.
    entries = []
    for i in range(start + 1, len(lines)):
        line = lines[i]
        match = re.match(r"^(\s+)-\s+(?:hostname|service):\s*(.*?)\s*(?:#.*)?$", line)
        if match:
            entries.append((i, len(match.group(1)), match.group(2).strip().strip("'\"")))
        if line.strip() and not line.startswith((" ", "\t", "#")):
            break
    if not entries:
        raise ValueError("Ingress has no service entries")
    indentation = entries[0][1]
    if indentation < 2 or any(level != indentation for _, level, _ in entries):
        raise ValueError("Inconsistent ingress indentation")
    fallback = [(i, label) for i, level, label in entries
                if label.startswith("http_status:")]
    if len(fallback) != 1:
        raise ValueError("Expected one terminal HTTP status fallback")
    routes = []
    for index, (line_idx, _, label) in enumerate(entries):
        next_idx = entries[index + 1][0] if index + 1 < len(entries) else len(lines)
        chunk = "".join(lines[line_idx:next_idx])
        if re.search(r"^\s*-\s*hostname:\s*['\"]?" + re.escape(HOST) + r"['\"]?\s*(?:#.*)?$", chunk, re.M):
            routes.append((line_idx, next_idx))
    if len(routes) > 1:
        raise ValueError("Duplicate exact Chessy routes")
    pad = " " * indentation
    block = (
        f"{pad}- hostname: {HOST}\n"
        f"{pad}  service: {ORIGIN}\n"
        f"{pad}  originRequest:\n"
        f"{pad}    httpHostHeader: {HOST}\n"
    )
    if routes:
        a, b = routes[0]
        lines[a:b] = [block]
    else:
        # Insert at beginning to override any earlier wildcard such as
        # *.lch-app.cloud while leaving it unchanged for LUMA.
        lines.insert(entries[0][0], block)
    result = "".join(lines)
    if result.count(f"- hostname: {HOST}\n") != 1:
        raise ValueError("Result does not contain exactly one Chessy host")
    return result
