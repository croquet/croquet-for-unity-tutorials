// reconfigurable startup script for an app using Croquet on NodeJS

const { MyModelRoot } = require("__APP_SOURCE__/Models.js");
const { StartSession } = require("./unity-bridge.js");
const { MyViewRoot } = require("__APP_SOURCE__/Views-unity.js");

StartSession(MyModelRoot, MyViewRoot);
