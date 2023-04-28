// Worldcore Tutorial 2

// This is the second in a series of tutorials illustrating how to build a Worldcore app. It
// shows how to create parent-child relationships and use view smoothing.

import { StartSession } from "../tutorials-common/unity-bridge";

import { MyViewRoot } from "./src/Views-unity";
import { MyModelRoot } from "./src/Models";

StartSession(MyModelRoot, MyViewRoot);
