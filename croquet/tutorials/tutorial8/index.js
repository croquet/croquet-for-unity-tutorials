// Worldcore Tutorial 8

// This is the eighth in a series of tutorials illustrating how to build a Worldcore app.
// This along with the following tutorial shows how to create avatars.

import { StartSession } from "../tutorials-common/unity-bridge";

import { MyViewRoot } from "./src/Views-unity";
import { MyModelRoot } from "./src/Models";

StartSession(MyModelRoot, MyViewRoot);
