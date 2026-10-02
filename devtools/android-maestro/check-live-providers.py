#!/usr/bin/env python3
"""Check public Supabase provider flags without printing local configuration values."""

import json
import sys
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen


def settings(path: Path) -> tuple[str, str]:
    values = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key] = value.strip().strip('"\'')
    url = values.get("PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = values.get("PUBLIC_SUPABASE_ANON_KEY", "")
    if urlparse(url).scheme != "https" or not key:
        raise ValueError(".env.local needs an HTTPS Supabase URL and anon key")
    return url, key


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: check-live-providers.py <.env.local> <main.lynx.bundle>", file=sys.stderr)
        return 2
    url, key = settings(Path(sys.argv[1]))
    bundle = Path(sys.argv[2]).read_bytes()
    if url.encode() not in bundle:
        print("Live Supabase URL is not embedded in the mobile bundle", file=sys.stderr)
        return 1
    request = Request(
        url + "/auth/v1/settings",
        headers={"apikey": key, "Authorization": "Bearer " + key},
    )
    with urlopen(request, timeout=15) as response:
        data = json.load(response)
    external = data.get("external") if isinstance(data, dict) else None
    if not isinstance(external, dict):
        external = {}
    missing = [
        provider
        for provider in ("apple", "google", "facebook")
        if external.get(provider) is not True
    ]
    for provider in ("apple", "google", "facebook"):
        print(f"{provider}: {'enabled' if provider not in missing else 'disabled'}")
    if missing:
        print("Missing enabled providers: " + ", ".join(missing), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Provider preflight failed: {type(error).__name__}", file=sys.stderr)
        raise SystemExit(1)
