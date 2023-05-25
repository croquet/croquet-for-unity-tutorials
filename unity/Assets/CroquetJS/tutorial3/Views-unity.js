// Tutorial 3 Views

// Identical code to the view in the previous tutorial.

import { Pawn, mix } from "@croquet/worldcore-kernel";
import { GameInputManager, GameViewRoot, PM_GameSmoothed, PM_GameRendered } from "../build-tools/sources/unity-bridge";


//------------------------------------------------------------------------------------------
// TestPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class TestPawn extends mix(Pawn).with(PM_GameRendered, PM_GameSmoothed) {
    constructor(actor) {
        super(actor);

        this.setGameObject({ type: 'primitiveCube' });
    }
}
TestPawn.register("TestPawn");

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyViewRoot extends GameViewRoot {
    static viewServices() {
        return [GameInputManager].concat(super.viewServices());
    }
}
