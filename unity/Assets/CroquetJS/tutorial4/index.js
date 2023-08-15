import { MyModelRoot } from "./Models";
import { StartSession, GameViewRoot } from "../.js-build/build-tools/sources/unity-bridge";

StartSession(MyModelRoot, GameViewRoot);
