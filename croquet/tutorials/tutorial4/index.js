// Worldcore Tutorial 4

// This is the fourth in a series of tutorials illustrating how to build a Worldcore app. It
// shows how to use snap to override view smoothing, and how rotations are stored.

import { StartSession } from "../tutorials-common/unity-bridge";

import { MyViewRoot } from "./src/Views-unity";
import { MyModelRoot } from "./src/Models";

StartSession(MyModelRoot, MyViewRoot);
