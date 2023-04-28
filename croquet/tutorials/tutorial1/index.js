// Worldcore Tutorial 1

// This is the first in a series of tutorials illustrating how to build a Worldcore app. It
// shows how to set up your model root and view root, and how to create an object in the world.

import { StartSession } from "../tutorials-common/unity-bridge";

import { MyViewRoot } from "./src/Views-unity";
import { MyModelRoot } from "./src/Models";

// To start a Worldcore session you need to provide an appId and apiKey, both of which are
// specified in the Unity editor (see the Getting Started documentation).

// In the JavaScript code, you only need to tell Worldcore the classes of your model root
// and view root. These two classes own all the other models and views in your application.

StartSession(MyModelRoot, MyViewRoot);
