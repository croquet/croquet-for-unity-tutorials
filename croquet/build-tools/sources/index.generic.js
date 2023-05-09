// reconfigurable import script for an app using Croquet on WebView

import { StartSession } from "./unity-bridge";

import { MyViewRoot } from "__APP_SOURCE__/Views-unity";
import { MyModelRoot } from "__APP_SOURCE__/Models";

StartSession(MyModelRoot, MyViewRoot);
