// startup script for an app using Croquet on NodeJS

const { MyModelRoot } = require("./src/Models.js");
const { StartSession } = require("../tutorials-common/unity-bridge.js");
const { MyViewRoot } = require("./src/Views-unity.js");

StartSession(MyModelRoot, MyViewRoot);
