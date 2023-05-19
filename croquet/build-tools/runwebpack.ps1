# on Windows, the CroquetBuilder.StartBuild script supplies us with 2 arguments:
# 1. full path to the platform-relevant node engine
# 2. app name - used in webpack.config to find the app source
# 3. build target: 'node' or 'web'

$NODE=$args[0]
$APPNAME=$args[1]
$TARGET=$args[2]

if (!(Test-Path ..\node_modules\webpack)) {
  Write-Warning "Cannot find webpack.  Did you do 'npm install'?"
  Exit
}

get-content sources\index-node.generic.js | % { $_ -replace '__APP_SOURCE__' , "../../$APPNAME" } | set-content sources\index-node.tmp.js
get-content sources\index.generic.js | % { $_ -replace '__APP_SOURCE__' , "../../$APPNAME" } | set-content sources\index.tmp.js

& "$NODE" ..\node_modules\webpack\bin\webpack.js --config webpack.config.js --mode development --env appName="$APPNAME" --env buildTarget="$TARGET" --no-color

# this output will be read by CroquetBuilder, to keep a record of the webpack process id
echo "webpack-exit=$LASTEXITCODE"
