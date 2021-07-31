#!/bin/bash

# https://gist.github.com/mohanpedala/1e2ff5661761d3abd0385e8223e16425 link to info on setting bash fail status'
set -e
set -u
set -x
set -o pipefail

exec gunicorn --bind :${PORT:-5000} --workers 2 --threads 8 --timeout 0 "app:create_app('${FLASK_CONFIG:-development}')"