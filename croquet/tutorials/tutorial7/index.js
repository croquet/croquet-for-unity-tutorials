// Worldcore Tutorial 7

// This is the seventh in a series of tutorials illustrating how to build a Worldcore app.
// It shows how to create your own behaviors.

import { StartSession } from "../tutorials-common/unity-bridge";

import { MyViewRoot } from "./src/Views-unity";
import { MyModelRoot } from "./src/Models";

StartSession(MyModelRoot, MyViewRoot);
