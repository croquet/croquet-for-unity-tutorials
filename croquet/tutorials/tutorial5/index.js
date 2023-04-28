// Worldcore Tutorial 5

// This is the fifth in a series of tutorials illustrating how to build a Worldcore app.
// It shows how to add new properties to actors, how to use random numbers, and how to
// transmit events with say() and listen().

import { StartSession } from "../tutorials-common/unity-bridge";

import { MyViewRoot } from "./src/Views-unity";
import { MyModelRoot } from "./src/Models";

StartSession(MyModelRoot, MyViewRoot);
