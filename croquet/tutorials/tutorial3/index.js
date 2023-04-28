// Worldcore Tutorial 3

// This is the third in a series of tutorials illustrating how to build a Worldcore app. It
// shows how to use behaviors to control actors.

import { StartSession } from "../tutorials-common/unity-bridge";

import {  MyViewRoot } from "./src/Views-unity";
import { MyModelRoot } from "./src/Models";

StartSession(MyModelRoot, MyViewRoot);
