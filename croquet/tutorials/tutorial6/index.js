// Worldcore Tutorial 6

// This is the sixth in a series of tutorials illustrating how to build a Worldcore app.
// It shows how to use instance rendering and raycasting in THREE.js

import { StartSession } from "../tutorials-common/unity-bridge";

import { MyViewRoot } from "./src/Views-unity";
import { MyModelRoot } from "./src/Models";

StartSession(MyModelRoot, MyViewRoot);
