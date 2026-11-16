#!/usr/bin/env python3
"""
Chessy Mac-native release installer. Run only on the actual macOS host.
Stages a CI-verified standalone Node release, migrates existing classroom credentials,
boots a dedicated launchd service, then updates only Chessy's Cloudflare ingress.
All operations are separate from Docker and retain the old domain as rollback.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import plistlib
import re
import shutil
import socket
import stat
import subprocess
import sys
import tempfile
import time
import zipfile

from lch_route import update_ingress

RELEASE = "7bd43252d21d6a5d728066b890a475ccac254e13"
ARTIFACT_SHA = "24b1ac4e3b217c74f604d1f14a13b1e8fbfa49a37adfed7e7c96fbd0226abd50"
JS_SHA = "d2267df0452498c0b3c0ee5a2fcc24cd2ce70bdb9c435ee4269d688d85ec4bc8"
PORT = 14178
SERVICE_LABEL = "com.lch.chessy.native"
PLIST_PATH = Path("/Library/LaunchDaemons") / (SERVICE_LABEL + ".plist")
CLOUDFLARED_PATH = Path("/etc/cloudflared/config.yml")
TUNNEL_LABELS = ("system/com.cloud-sandbox.cloudflared", "system/com.cloudflare.cloudflared")
SECRETS = {
    "CHESSY_AULA_TEACHER_SECRET_FILE": "teacher.code",
    "CHESSY_AULA_ADMIN_SECRET_FILE": "admin.code",
    "CHESSY_AULA_TEACHERS_FILE": "teachers.json",
}
REQUIRED = {
    "dist/index.html",
    "dist/aula/index.html",
    "dist/aula/app.js",
    "progress/runtime/aula-server.mjs",
}
SAFE_SHA = re.compile(r"^[0-9a-f]{64}$")
BASE = Path.home() / "Library/Application Support/LCH/Chessy"
HANDOFF = Path(__file__).resolve().parent


def run(*args: str, check: bool = True, **kwargs):
    return subprocess.run(list(map(str, args)), check=check, **kwargs)


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for data in iter(lambda: f.read(1024 * 1024), b""):
            h.update(data)
    return h.hexdigest()


def validate_bundle(zip_path: Path) -> None:
    if sha(zip_path) != ARTIFACT_SHA:
        raise ValueError("Chessy CI bundle SHA-256 mismatch")
    with zipfile.ZipFile(zip_path) as z:
        items = z.infolist()
        if len(items) > 20000 or sum(i.file_size for i in items) > 400 * 1024 * 1024:
            raise ValueError("Unexpected release bundle size")
        names = {i.filename for i in items if not i.is_dir()}
        if not REQUIRED.issubset(names):
            raise ValueError("Chessy classroom/server files missing")
        for info in items:
            name = PurePosixPath(info.filename)
            mode = info.external_attr >> 16
            kind = stat.S_IFMT(mode)
            if (name.is_absolute() or ".." in name.parts or "\\" in info.filename
                    or (name.parts[0] != "dist" and
                        info.filename != "progress/runtime/aula-server.mjs")
                    or kind not in (0, stat.S_IFREG, stat.S_IFDIR)):
                raise ValueError("Unexpected or unsafe ZIP member")
        if hashlib.sha256(z.read("dist/aula/app.js")).hexdigest() != JS_SHA:
            raise ValueError("Classroom JS differs from the CI-approved release")


def check_staged_secrets(path: Path) -> None:
    for variable, filename in SECRETS.items():
        src = path / filename
        info = src.lstat()
        if not stat.S_ISREG(info.st_mode) or src.is_symlink() or info.st_mode & 0o077:
            raise ValueError(f"Unsafe staged permissions for {variable}")
        if filename == "teachers.json":
            data = json.loads(src.read_text())
            if not isinstance(data.get("teachers"), list) or not isinstance(data.get("events"), list):
                raise ValueError("Teacher registry has invalid structure")
        elif len(src.read_text().strip()) < 24:
            raise ValueError(f"Missing required teacher/admin code: {variable}")


def curl_data(url: str, timeout: int = 10, host_header: str | None = None) -> bytes:
    # Existing Mac edge: native cloudflared → localhost:8080 (Caddy) → Docker
    # Chessy. Connecting directly here avoids Cloudflare hairpin timeouts on Mac.
    args = ["curl", "--fail", "--silent", "--show-error", "--connect-timeout", "4",
            "--max-time", str(timeout)]
    if host_header is not None:
        if host_header not in ("chessy.textilesdemedellin.com", "chessy.lch-app.cloud"):
            raise ValueError("Unrecognized Chessy Host header")
        args.extend(("--header", "Host: " + host_header))
    args.append(url)
    return run(*args, capture_output=True).stdout


def check_release(origin: str, include_js: bool = False) -> None:
    origin = origin.rstrip("/")
    h = json.loads(curl_data(origin + "/health"))
    a = json.loads(curl_data(origin + "/aula/api/health"))
    if h.get("status") != "ok" or h.get("release_sha") != RELEASE:
        raise RuntimeError("Incorrect Chessy release on " + origin)
    if a.get("status") != "ok" or a.get("backendReady") is not True:
        raise RuntimeError("Classroom backend failed on " + origin)
    if include_js:
        html = curl_data(origin + "/aula/")
        js = curl_data(origin + "/aula/app.js?release=" + RELEASE)
        if b"app.js" not in html or hashlib.sha256(js).hexdigest() != JS_SHA:
            raise RuntimeError("Classroom HTML or JS does not match the release")


def check_old_rooms() -> None:
    # Verify the *actual* original production origin directly through the
    # existing Mac Caddy site. FINALIZE_CHESSY.sh explicitly health-checks
    # this same endpoint with Host: chessy.textilesdemedellin.com.
    # Never let a failed public hairpin probe bypass the room occupancy gate.
    origin = "http://127.0.0.1:8080"
    host = "chessy.textilesdemedellin.com"
    identity = json.loads(curl_data(origin + "/health", host_header=host))
    if (identity.get("status") != "ok" or
            identity.get("product") != "chessy" or
            identity.get("release_sha") != RELEASE):
        raise RuntimeError("Old local Chessy route does not serve the expected release")
    data = json.loads(curl_data(origin + "/aula/api/health", host_header=host))
    if data.get("status") != "ok" or data.get("backendReady") is not True:
        raise RuntimeError("Old classroom local origin is unhealthy")
    if type(data.get("roomsActive")) is not int or data["roomsActive"] < 0:
        raise RuntimeError("Old classroom active-room count is invalid")
    if data["roomsActive"] != 0:
        raise RuntimeError("An active classroom exists; cutover refused")
    print("OLD_LOCAL_CHESSY_PREFLIGHT_PASS zero-active-rooms")


def prepare() -> tuple[Path, Path]:
    bundle = HANDOFF / "chessy-aula-release.zip"
    source = HANDOFF / "private"
    validate_bundle(bundle)
    check_staged_secrets(source)
    base = BASE
    release = base / "releases" / RELEASE
    secrets = base / "private"
    for p in (base, base / "releases", secrets, base / "logs"):
        p.mkdir(mode=0o700, parents=True, exist_ok=True)
        p.chmod(0o700)
    for key, name in SECRETS.items():
        src, dst = source / name, secrets / name
        if dst.exists():
            if dst.is_symlink() or sha(dst) != sha(src):
                raise RuntimeError(f"Existing {key} differs; refusing to overwrite")
        else:
            with src.open("rb") as input_file, dst.open("xb") as output_file:
                shutil.copyfileobj(input_file, output_file)
        dst.chmod(0o600)
    if not release.exists():
        folder = Path(tempfile.mkdtemp(prefix=".stage-chessy-", dir=base / "releases"))
        try:
            with zipfile.ZipFile(bundle) as archive:
                for info in archive.infolist():
                    if info.is_dir():
                        continue
                    path = folder.joinpath(*PurePosixPath(info.filename).parts)
                    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
                    with archive.open(info) as inp, path.open("xb") as out:
                        shutil.copyfileobj(inp, out)
            (folder / "progress/runtime/aula-server.mjs").rename(folder / "server.mjs")
            shutil.rmtree(folder / "progress")
            if sha(folder / "dist/aula/app.js") != JS_SHA:
                raise RuntimeError("Staged JavaScript checksum mismatch")
            folder.rename(release)
        finally:
            if folder.exists():
                shutil.rmtree(folder)
    if not (release / "server.mjs").is_file() or sha(release / "dist/aula/app.js") != JS_SHA:
        raise RuntimeError("Existing release is incomplete or tampered")
    return release, secrets


def env_for(release: Path, secrets: Path) -> dict[str, str]:
    return {
        "CHESSY_DIST": str(release / "dist"),
        "CHESSY_RELEASE_SHA": RELEASE,
        "CHESSY_DEPLOYMENT_CLASS": "public-web",
        "CHESSY_AULA_TEACHER_SECRET_FILE": str(secrets / "teacher.code"),
        "CHESSY_AULA_ADMIN_SECRET_FILE": str(secrets / "admin.code"),
        "CHESSY_AULA_TEACHERS_FILE": str(secrets / "teachers.json"),
        "HOST": "127.0.0.1",
        "PORT": str(PORT),
    }


def node_path() -> str:
    path = shutil.which("node")
    if not path:
        raise RuntimeError("Node.js 22+ is required on the Mac host")
    version = run(path, "--version", capture_output=True, text=True).stdout.strip()
    major = int(re.search(r"v(\d+)", version).group(1))
    if major < 22:
        raise RuntimeError("Node.js 22+ required, found " + version)
    return str(path)


def wait_for_local_ready(attempts=24):
    for count in range(attempts):
        try:
            check_release(f"http://127.0.0.1:{PORT}", include_js=True)
            return
        except Exception:
            time.sleep(0.6)
    raise RuntimeError("Native Chessy did not become healthy on localhost")


def smoke_candidate(node: str, release: Path, env: dict[str, str]) -> None:
    with socket.socket() as sock:
        if sock.connect_ex(("127.0.0.1", PORT)) == 0:
            raise RuntimeError(f"Native port {PORT} already in use")
    logfile = BASE / "logs/candidate.log"
    with logfile.open("ab") as log:
        child = subprocess.Popen(
            [node, str(release / "server.mjs")],
            env={**os.environ, **env}, cwd=str(release),
            stdin=subprocess.DEVNULL, stdout=log, stderr=log)
        try:
            wait_for_local_ready()
        finally:
            child.terminate()
            try:
                child.wait(timeout=5)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait(timeout=5)


def install_launchd(node: str, release: Path, secrets: Path) -> None:
    if PLIST_PATH.exists():
        try:
            with PLIST_PATH.open("rb") as f:
                existing = plistlib.load(f)
        except Exception as exc:
            raise RuntimeError("Existing Chessy launchd plist is unreadable") from exc
        if (existing.get("Label") != SERVICE_LABEL or
                existing.get("ProgramArguments") != [node, str(release / "server.mjs")] or
                existing.get("EnvironmentVariables") != env_for(release, secrets)):
            raise RuntimeError("Existing Chessy native service differs; refusing overwrite")
        print("CHESSY_NATIVE_SERVICE_ALREADY_INSTALLED")
        # If a previous run succeeded in bootstrap but tunnel routing failed,
        # continuing must not create a second service or disrupt the working one.
        try:
            wait_for_local_ready(attempts=3)
            return
        except RuntimeError:
            pass
        if run("sudo", "launchctl", "print", f"system/{SERVICE_LABEL}", check=False,
               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode != 0:
            run("sudo", "launchctl", "bootstrap", "system", str(PLIST_PATH))
        else:
            run("sudo", "launchctl", "kickstart", "-k", f"system/{SERVICE_LABEL}")
        wait_for_local_ready()
        return
    label = SERVICE_LABEL
    obj = {
        "Label": label,
        "ProgramArguments": [node, str(release / "server.mjs")],
        "UserName": os.environ.get("USER") or Path.home().name,
        "WorkingDirectory": str(release),
        "EnvironmentVariables": env_for(release, secrets),
        "RunAtLoad": True,
        "KeepAlive": True,
        "StandardOutPath": str(BASE / "logs/chessy.stdout.log"),
        "StandardErrorPath": str(BASE / "logs/chessy.stderr.log"),
        "ThrottleInterval": 5,
    }
    with tempfile.TemporaryDirectory(prefix="chessy-plist-") as temp:
        candidate = Path(temp) / (label + ".plist")
        with candidate.open("wb") as f:
            plistlib.dump(obj, f)
        run("sudo", "install", "-o", "root", "-g", "wheel", "-m", "0644",
            str(candidate), str(PLIST_PATH))
    run("sudo", "launchctl", "bootstrap", "system", str(PLIST_PATH))
    wait_for_local_ready()


def tunnel_label() -> str:
    for label in TUNNEL_LABELS:
        if run("sudo", "launchctl", "print", label, check=False,
               capture_output=True).returncode == 0:
            return label
    raise RuntimeError("Existing native cloudflared LaunchDaemon not found")


def configure_tunnel() -> None:
    label = tunnel_label()
    prior = run("sudo", "cat", str(CLOUDFLARED_PATH),
                capture_output=True, text=True).stdout
    if not prior:
        raise RuntimeError("Cloudflare tunnel config unavailable")
    desired = update_ingress(prior)
    if desired == prior:
        print("CHESSY_INGRESS_ALREADY_CONFIGURED")
        check_release("https://chessy.lch-app.cloud", include_js=True)
        return
    # Recheck occupancy at the actual route cutover, not only before staging.
    # Also prove the native origin is still serving the approved exact release.
    check_release(f"http://127.0.0.1:{PORT}", include_js=True)
    check_old_rooms()
    cloudflared = shutil.which("cloudflared")
    if not cloudflared:
        cloudflared = "/opt/homebrew/bin/cloudflared"
    if not Path(cloudflared).is_file():
        raise RuntimeError("Native macOS cloudflared CLI missing")
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = f"/etc/cloudflared/config.yml.pre-chessy-native-{stamp}"
    with tempfile.TemporaryDirectory(prefix="chessy-ingress-") as temp:
        cfg = Path(temp) / "config.yml"
        cfg.write_text(desired)
        cfg.chmod(0o600)
        run(cloudflared, "tunnel", "--config", str(cfg), "ingress", "validate")
        run("sudo", "cp", "-p", str(CLOUDFLARED_PATH), backup)
        try:
            run("sudo", "install", "-o", "root", "-g", "wheel", "-m", "0600",
                str(cfg), str(CLOUDFLARED_PATH))
            run("sudo", "launchctl", "kickstart", "-k", label)
            for _ in range(20):
                try:
                    check_release("https://chessy.lch-app.cloud", include_js=True)
                    print("CHESSY_LCH_NATIVE_GO", RELEASE)
                    return
                except Exception:
                    time.sleep(2)
            raise RuntimeError("Public LCH health and artifact checks did not pass")
        except Exception:
            # Other tunnel hosts are restored to byte-for-byte original config.
            run("sudo", "cp", "-p", backup, str(CLOUDFLARED_PATH))
            run("sudo", "launchctl", "kickstart", "-k", label, check=False)
            raise RuntimeError("Tunnel routing failed; prior config restored") from None


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true", help="Validate bundle and staged secrets without changing macOS")
    ap.add_argument("--go", action="store_true", help="Install native launchd + update only Chessy's tunnel route")
    a = ap.parse_args()
    if a.dry_run:
        validate_bundle(HANDOFF / "chessy-aula-release.zip")
        check_staged_secrets(HANDOFF / "private")
        print("CHESSY_NATIVE_DRY_RUN_PASS", RELEASE)
        return
    if not a.go:
        ap.error("Use --dry-run or --go")
    if sys.platform != "darwin":
        raise RuntimeError("Only run --go on the Mac host, never in Docker")
    if os.geteuid() == 0:
        raise RuntimeError("Run as logged-in macOS operator; sudo is used only for host-owned files")
    node = node_path()
    release, secrets = prepare()
    check_old_rooms()
    env = env_for(release, secrets)
    try:
        check_release(f"http://127.0.0.1:{PORT}", include_js=True)
        print("CHESSY_NATIVE_PREEXISTING_PROCESS_HEALTHY")
    except Exception:
        smoke_candidate(node, release, env)
    install_launchd(node, release, secrets)
    configure_tunnel()
    print("RELEASE_ACTIVE", RELEASE, "https://chessy.lch-app.cloud/aula/")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("CHESSY_NATIVE_NO_GO:", type(exc).__name__, str(exc), file=sys.stderr)
        raise SystemExit(2)
