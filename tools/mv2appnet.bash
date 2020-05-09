#!/usr/bin/env bash
find . -type f -name "*.js" -print0 | \
xargs -0 sed -i 's/aiworkspace.com/appnet.link/g; s/iwebpp@gmail.com/appnet.link@gmail.com/g; s/appnet.io/appnet.link/g; s/AppNet.io/AppNet.link/g; s/appnet.io-ws/appnet.link-ws/g; s/iWebPP/AppNet/g'

find . -type f -name "README.md" -print0 | \
xargs -0 sed -i 's/aiworkspace.com/appnet.link/g; s/iwebpp@gmail.com/appnet.link@gmail.com/g; s/appnet.io/appnet.link/g; s/AppNet.io/AppNet.link/g; s/appnet.io-ws/appnet.link-ws/g; s/iWebPP/AppNet/g'

find . -type f -name "Dockerfile*" -print0 | \
xargs -0 sed -i 's/aiworkspace.com/appnet.link/g; s/iwebpp@gmail.com/appnet.link@gmail.com/g; s/appnet.io/appnet.link/g; s/AppNet.io/AppNet.link/g; s/appnet.io-ws/appnet.link-ws/g; s/iWebPP/AppNet/g'

find . -type f -name "package.json" -print0 | \
xargs -0 sed -i 's/aiworkspace.com/appnet.link/g; s/iwebpp@gmail.com/appnet.link@gmail.com/g; s/appnet.io/appnet.link/g; s/AppNet.io/AppNet.link/g; s/appnet.io-ws/appnet.link-ws/g; s/iWebPP/AppNet/g'
