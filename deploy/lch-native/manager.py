#!/usr/bin/env python3
"""Docker-independent, fail-closed Chessy release promotion for an LCH Linux host.

This tool never edits Cloudflare, Caddy, LUMA, or the old Chessy deployment.
It stages an immutable CI artifact and restarts only the chessy-lch systemd unit.
"""
from __future__ import annotations

import argparse
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import pwd
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import time
from urllib.request import urlopen
import zipfile

SHA40 = re.compile(r"^[0-9a-f]{40}$")
SHA64 = re.compile(r"^[0-9a-f]{64}$")
REQUIRED = {
    "dist/index.html",
    "dist/aula/index.html",
    "dist/aula/app.js",
    "progress/runtime/aula-server.mjs",
}
SECRET_KEYS = (
    "CHESSY_AULA_TEACHER_SECRET_FILE",
    "CHESSY_AULA_ADMIN_SECRET_FILE",
    "CHESSY_AULA_TEACHERS_FILE",
)
MAX_UNCOMPRESSED = 400 * 1024 * 1024
MAX_ENTRIES = 20000


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_json_url(url: str, timeout: int = 8) -> dict:
    with urlopen(url, timeout=timeout) as response:
        if response.status != 200:
            raise RuntimeError(f"HTTP {response.status} from {url}")
        result = json.load(response)
        if not isinstance(result, dict):
            raise RuntimeError("Unexpected JSON payload")
        return result


def is_safe_entry(item: zipfile.ZipInfo) -> bool:
    name = item.filename
    parts = PurePosixPath(name).parts
    if not name or name.startswith("/") or "\\" in name or any(x in {".", ".."} for x in parts):
        return False
    if not (name.startswith("dist/") or name == "progress/runtime/aula-server.mjs"):
        return False
    mode = (item.external_attr >> 16) & 0xFFFF
    # GitHub Actions archives may store UNIX permissions without S_IFREG.
    # Accept regular files, directories and entries with an unspecified type.
    kind = stat.S_IFMT(mode)
    if kind not in (0, stat.S_IFREG, stat.S_IFDIR):
        return False
    return True


def stage(zip_path: Path, release: str, expected_zip_sha256: str, root: Path) -> Path:
    if not SHA40.fullmatch(release) or not SHA64.fullmatch(expected_zip_sha256):
        raise ValueError("Both release SHA and artifact SHA-256 are required")
    artifact = zip_path.read_bytes()
    if digest(artifact) != expected_zip_sha256:
        raise RuntimeError("Artifact SHA-256 mismatch")
    releases = root / "releases"
    releases.mkdir(mode=0o755, parents=True, exist_ok=True)
    target = releases / release
    if target.exists():
        manifest = json.loads((target / "release-manifest.json").read_text())
        if manifest.get("artifact_sha256") != expected_zip_sha256:
            raise RuntimeError("Release already exists with different artifact")
        return target
    folder = Path(tempfile.mkdtemp(prefix=".stage-", dir=releases))
    try:
        with zipfile.ZipFile(zip_path) as archive:
            items = archive.infolist()
            if len(items) > MAX_ENTRIES or sum(x.file_size for x in items) > MAX_UNCOMPRESSED:
                raise RuntimeError("Archive exceeds resource limits")
            filenames = {x.filename for x in items if not x.is_dir()}
            if not REQUIRED.issubset(filenames) or any(not is_safe_entry(x) for x in items):
                raise RuntimeError("Artifact contains missing or unexpected entries")
            for item in items:
                if item.is_dir():
                    continue
                destination = folder.joinpath(*PurePosixPath(item.filename).parts)
                destination.parent.mkdir(parents=True, exist_ok=True)
                with archive.open(item) as src, destination.open("xb") as dst:
                    shutil.copyfileobj(src, dst)
        (folder / "progress/runtime/aula-server.mjs").rename(folder / "server.mjs")
        shutil.rmtree(folder / "progress")
        subprocess.run(["node", "--check", str(folder / "server.mjs")], check=True)
        subprocess.run(["node", "--check", str(folder / "dist/aula/app.js")], check=True)
        manifest = {
            "release_sha": release,
            "artifact_sha256": expected_zip_sha256,
            "server_sha256": digest((folder / "server.mjs").read_bytes()),
            "aula_app_sha256": digest((folder / "dist/aula/app.js").read_bytes()),
            "staged_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
            "scope": "lch-independent-runtime",
        }
        (folder / "release-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        for directory in [folder, *[p for p in folder.rglob("*") if p.is_dir()]]:
            directory.chmod(0o755)
        for file in [p for p in folder.rglob("*") if p.is_file()]:
            file.chmod(0o644)
        folder.rename(target)
        return target
    finally:
        if folder.exists():
            shutil.rmtree(folder)


def read_secret_paths(env_file: Path) -> dict[str, Path]:
    if not env_file.is_file():
        raise RuntimeError("Missing runtime environment file")
    values: dict[str, str] = {}
    for raw in env_file.read_text().splitlines():
        raw = raw.strip()
        if not raw or raw.startswith("#"):
            continue
        if "=" not in raw:
            raise RuntimeError("Invalid environment configuration")
        key, value = raw.split("=", 1)
        values[key.strip()] = value.strip().strip("'\"")
    missing = set(SECRET_KEYS).difference(values)
    if missing:
        raise RuntimeError("Missing classroom secret paths: " + ", ".join(sorted(missing)))
    paths = {key: Path(values[key]) for key in SECRET_KEYS}
    expected_owner = pwd.getpwnam("chessy").pw_uid
    for key, path in paths.items():
        info = path.lstat()
        if not stat.S_ISREG(info.st_mode) or info.st_mode & 0o077 or info.st_uid != expected_owner:
            raise RuntimeError(f"Unsafe owner/permissions for {key}")
        if key != "CHESSY_AULA_TEACHERS_FILE":
            minimum = 30 if key == "CHESSY_AULA_ADMIN_SECRET_FILE" else 24
            if len(path.read_text().strip()) < minimum:
                raise RuntimeError(f"Invalid length for {key}")
        else:
            registry = json.loads(path.read_text())
            if registry.get("version") != 1 or not isinstance(registry.get("teachers"), list) or not isinstance(registry.get("events"), list):
                raise RuntimeError("Invalid teacher registry; refusing to replace existing governance data")
    return paths


def check_rooms_empty(origin: str) -> None:
    data = read_json_url(origin.rstrip("/") + "/aula/api/health")
    if data.get("status") != "ok" or data.get("backendReady") is not True:
        raise RuntimeError("Existing classroom backend is unhealthy; refusing restart")
    if data.get("roomsActive") != 0:
        raise RuntimeError("Active classroom sessions; refusing restart")


def check_release(origin: str, sha: str) -> None:
    base = origin.rstrip("/")
    health = read_json_url(base + "/health")
    classroom = read_json_url(base + "/aula/api/health")
    if health.get("status") != "ok" or health.get("release_sha") != sha:
        raise RuntimeError("Unexpected Chessy release or unhealthy site")
    if classroom.get("status") != "ok" or classroom.get("backendReady") is not True:
        raise RuntimeError("Classroom API is not ready")


def swap_link(root: Path, target: Path) -> None:
    tmp = root / (".current-" + str(os.getpid()))
    if tmp.exists() or tmp.is_symlink():
        tmp.unlink()
    tmp.symlink_to(target)
    os.replace(tmp, root / "current")


def activate(release: str, root: Path, env_file: Path, origin: str, service: str) -> None:
    if not SHA40.fullmatch(release):
        raise ValueError("Invalid Git SHA")
    if service != "chessy-lch.service":
        raise RuntimeError("Only the dedicated chessy-lch service may be restarted")
    read_secret_paths(env_file)
    target = (root / "releases" / release).resolve(strict=True)
    if target.parent != (root / "releases").resolve(strict=True):
        raise RuntimeError("Invalid release path")
    if not (target / "server.mjs").is_file() or not (target / "dist/aula/index.html").is_file():
        raise RuntimeError("Release artifact incomplete")
    lock_path = root / ".release.lock"
    with lock_path.open("a+") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        link = root / "current"
        if link.exists() and not link.is_symlink():
            raise RuntimeError("Refusing to replace a non-symlink current path")
        previous = link.resolve(strict=True) if link.is_symlink() else None
        if previous == target:
            check_release(origin, release)
            print(f"ALREADY_ACTIVE {release}")
            return
        if previous:
            check_rooms_empty(origin)
        subprocess.run(["systemctl", "cat", service], check=True, stdout=subprocess.DEVNULL)
        swap_link(root, target)
        try:
            subprocess.run(["systemctl", "restart", service], check=True)
            for attempt in range(12):
                try:
                    check_release(origin, release)
                    print(f"PROMOTED {release}")
                    return
                except Exception:
                    if attempt == 11:
                        raise
                    time.sleep(2)
        except Exception:
            if previous:
                swap_link(root, previous)
                subprocess.run(["systemctl", "restart", service], check=True)
            else:
                link.unlink(missing_ok=True)
                subprocess.run(["systemctl", "stop", service], check=False)
            raise RuntimeError("Promotion failed; previous release restored") from None


def smoke(origin: str, release: str, root: Path) -> None:
    check_release(origin, release)
    manifest = json.loads((root / "releases" / release / "release-manifest.json").read_text())
    with urlopen(origin.rstrip("/") + "/aula/app.js", timeout=12) as response:
        if response.status != 200 or digest(response.read()) != manifest["aula_app_sha256"]:
            raise RuntimeError("Public Chessy app does not match the release artifact")
    with urlopen(origin.rstrip("/") + "/aula/", timeout=12) as response:
        if response.status != 200 or b"app.js" not in response.read():
            raise RuntimeError("Classroom HTML is not reachable")
    print(f"PASS {origin} release={release} classroom=ready JS=sha256-matched")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path("/srv/chessy"))
    sub = parser.add_subparsers(dest="action", required=True)
    s = sub.add_parser("stage")
    s.add_argument("--artifact", type=Path, required=True)
    s.add_argument("--release", required=True)
    s.add_argument("--artifact-sha256", required=True)
    a = sub.add_parser("activate")
    a.add_argument("--release", required=True)
    a.add_argument("--env-file", type=Path, default=Path("/etc/chessy/chessy.env"))
    a.add_argument("--origin", default="http://127.0.0.1:14176")
    a.add_argument("--service", default="chessy-lch.service")
    v = sub.add_parser("smoke")
    v.add_argument("--release", required=True)
    v.add_argument("--origin", default="https://chessy.lch-app.cloud")
    args = parser.parse_args()
    try:
        if args.action == "stage":
            print("STAGED", stage(args.artifact, args.release, args.artifact_sha256, args.root))
        elif args.action == "activate":
            activate(args.release, args.root, args.env_file, args.origin, args.service)
        else:
            smoke(args.origin, args.release, args.root)
    except (OSError, RuntimeError, ValueError, subprocess.CalledProcessError, zipfile.BadZipFile) as exc:
        print("RELEASE_NO_GO:", str(exc), file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
