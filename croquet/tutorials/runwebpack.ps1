# on Windows, the CroquetBuilder.StartBuild script supplies us with 2 arguments:
# 1. full path to the platform-relevant node engine
# 2. app name - which for the tutorials family of apps is used in the webpack.config

$NODE=$args[0]
$APPNAME=$args[1]

& "$NODE" node_modules\webpack\bin\webpack.js --config webpack.config.js --mode development --env appName="$APPNAME" --env buildTarget=node --no-color
