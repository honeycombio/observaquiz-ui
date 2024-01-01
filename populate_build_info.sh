#!/bin/bash

# how to run:
#  be in ..
#  $0 >> dist/build_info.js

cat src/build_info.js | \
  sed "s/COMMIT_SHA/$(git rev-parse HEAD)/" | \
  sed "s/HOSTNAME/${HOSTNAME}/" \
  > dist/build_info.js
