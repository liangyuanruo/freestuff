#!/bin/bash
rollup --watch --config rollup.config.js & /
sass --watch src/sass:src/public & /
nodemon src/index.js