#!/bin/bash

set -e

if [ -z "$CI" ]; then
  npm i
else
  npm ci
fi

npx husky
