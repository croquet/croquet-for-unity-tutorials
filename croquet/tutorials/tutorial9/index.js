// Worldcore Tutorial 9

// This is the ninth in a series of tutorials illustrating how to build a Worldcore app.
// It shows how to create a first-person avatar, and switch between different avatars on the fly.

import { StartSession } from "../tutorials-common/unity-bridge";

import { MyViewRoot } from "./src/Views-unity";
import { MyModelRoot } from "./src/Models";

StartSession(MyModelRoot, MyViewRoot);
