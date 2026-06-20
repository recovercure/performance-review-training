@echo off
setlocal

set PORT=5000
if defined DEPLOY_RUN_PORT set PORT=%DEPLOY_RUN_PORT%

echo Starting HTTP service on port %PORT% for dev...
set PORT=%PORT%
npx tsx watch src/server.ts
