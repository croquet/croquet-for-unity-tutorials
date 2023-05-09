# on Windows, the CroquetBuilder.StartBuild script supplies us with 2 arguments:
# 1. full path to the platform-relevant node engine
# 2. app name - used in webpack.config to find the app source

$NODE=$args[0]
$APPNAME=$args[1]

get-content sources\index-node.generic.js | % { $_ -replace '__APP_SOURCE__' , "../../$APPNAME" } | set-content sources\index-node.tmp.js

& "$NODE" ..\node_modules\webpack\bin\webpack.js --config webpack.config.js --mode development --env appName="$APPNAME" --env buildTarget=node --no-color
