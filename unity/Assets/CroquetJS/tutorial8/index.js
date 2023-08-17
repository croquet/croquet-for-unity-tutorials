import { StartSession, GameViewRoot } from "@croquet/unity-bridge"; // eslint-disable-line import/no-unresolved
import { MyModelRoot } from "./Models";

StartSession(MyModelRoot, GameViewRoot);
