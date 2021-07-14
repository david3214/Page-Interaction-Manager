#!/bin/bash

# https://gist.github.com/mohanpedala/1e2ff5661761d3abd0385e8223e16425 link to info on setting bash fail status'
set -e
set -u
set -x
set -o pipefail

celery -A celery_worker worker --loglevel=INFO -Q ${CELERY_QUEUE:-results}