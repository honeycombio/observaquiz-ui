#!/bin/bash

# how to run:
#  be in ..
#  $0 >> dist/build_info.js

cat src/tracing/build_info.example.ts | \
  sed "s/COMMIT_SHA/$(git rev-parse HEAD)/" | \
  sed "s/HOSTNAME/${HOSTNAME}/" | \
  sed "s/UUID/$(uuidgen)/" \
  > src/tracing/build_info.tmp.ts
