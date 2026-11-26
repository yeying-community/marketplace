#!/usr/bin/env python3
"""Read quality evidence from the Tester analysis API."""

import argparse
import json
import os
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


class RejectRedirects(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, newurl):
        return None


def base_url():
    url = urlsplit(os.environ.get("YEYING_TESTER_URL", "").strip())
    loopback = url.hostname in ("localhost", "127.0.0.1", "::1")
    https = url.scheme == "https" or (url.scheme == "http" and loopback)
    if (not https or not url.hostname or url.username is not None or url.password is not None
            or url.path not in ("", "/") or url.query or url.fragment):
        raise ValueError("Set YEYING_TESTER_URL to the Tester HTTPS origin (HTTP is supported for loopback).")
    return f"{url.scheme}://{url.netloc}"


def get(path, query=None):
    token = os.environ.get("YEYING_TESTER_TOKEN", "").strip()
    if not token:
        raise ValueError("Set YEYING_TESTER_TOKEN from the Tester admin console.")
    url = base_url() + "/api/v1/analysis/" + path
    if query:
        url += "?" + urlencode(query)
    request = Request(url, headers={"Authorization": "Bearer " + token, "Accept": "application/json"})
    with build_opener(RejectRedirects).open(request, timeout=45) as response:
        if response.headers.get_content_type() != "application/json":
            raise ValueError("Tester did not return JSON. Check the origin and deployed service version.")
        return json.load(response)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("overview")
    for command in ("project", "runs", "run", "stability"):
        sub = commands.add_parser(command)
        sub.add_argument("project")
        if command in ("runs", "stability"):
            sub.add_argument("--limit", type=int, default=20, choices=range(1, 51), metavar="1–50")
            sub.add_argument("--before", help="next_cursor from the previous response")
            sub.add_argument("--mode", choices=("deployed", "local-source", "unknown"))
        if command == "run":
            sub.add_argument("scope", help="scope returned by runs (project slug or __full__)")
            sub.add_argument("run", help="run ID returned by runs")
        if command in ("run", "stability"):
            sub.add_argument("--case-id", help="filter results by a documented case ID")

    args = parser.parse_args()
    try:
        if args.command == "overview":
            value = get("overview")
        else:
            if not re.fullmatch(r"[a-z][a-z0-9-]*", args.project):
                raise ValueError("Use a project slug from overview.")
            path = "projects/" + args.project
            if args.command in ("runs", "stability"):
                query = {"limit": args.limit}
                if args.before:
                    query["before"] = args.before
                if args.mode:
                    query["mode"] = args.mode
                value = get(path + "/" + args.command, query)
            elif args.command == "run":
                if args.scope not in (args.project, "__full__"):
                    raise ValueError("Use the scope returned by runs.")
                value = get(path + "/runs/" + args.scope + "/" + quote(args.run, safe=""))
            else:
                value = get(path)
            if getattr(args, "case_id", None):
                sections = value.get("groups", [value])
                for section in sections:
                    section["cases"] = [row for row in section["cases"] if args.case_id in row["case_ids"]]
        print(json.dumps(value, ensure_ascii=False, indent=2))
    except HTTPError as error:
        message = {
            401: "Verify the analysis token and its expiration in the Tester admin console.",
            404: "Check the deployed analysis API, project slug, or run ID.",
        }.get(error.code, "Check the request and Tester service status.")
        print(f"Tester HTTP {error.code}. {message}", file=sys.stderr)
        return 1
    except (URLError, OSError):
        print("Could not reach Tester. Check connectivity and TLS.", file=sys.stderr)
        return 1
    except ValueError as error:
        print(f"Tester request failed. {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
