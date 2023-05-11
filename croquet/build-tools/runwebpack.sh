#!/bin/bash

# the CroquetBuilder.StartBuild script supplies us with 3 or 4 arguments:
# 1. full path to the platform-relevant node engine
# 2. app name - used in webpack.config to find the app source
# 3. build target: 'node' or 'web'
# 4. full path to a temporary file to be used for watcher output (if not provided,
#    that means we should perform a one-time build)

cd `dirname "$0"`

NODE=$1
APPNAME=$2
TARGET=$3

if [ ! -d ../node_modules/webpack ]; then
	echo "Cannot find webpack.  Did you do 'npm install'?"
	exit
fi

sed -e "s/__APP_SOURCE__/..\/..\/$APPNAME/g" sources/index.generic.js > sources/index.tmp.js
sed -e "s/__APP_SOURCE__/..\/..\/$APPNAME/g" sources/index-node.generic.js > sources/index-node.tmp.js

if [ $# -eq 4 ]; then
	LOGFILE=$4
	"$NODE" ../node_modules/.bin/webpack --config webpack.config.js --watch --mode development --env appName=$APPNAME --env buildTarget=$TARGET --no-color > $LOGFILE 2>&1 &

	# this output will be read by CroquetBuilder, to keep a record of the webpack process id
	echo "webpack=$!"
else
	"$NODE" ../node_modules/.bin/webpack --config webpack.config.js --mode development --env appName=$APPNAME --env buildTarget=$TARGET --no-color

	echo "webpack-exit=$?"
fi
