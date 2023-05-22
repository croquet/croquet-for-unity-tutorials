// Tutorial 2 Views

import { Pawn, mix } from "@croquet/worldcore-kernel";
import { GameInputManager, GameViewRoot, PM_GameSmoothed, PM_GameRendered } from "../build-tools/sources/unity-bridge";

//------------------------------------------------------------------------------------------
// TestPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Instead of PM_GameSpatial, this pawn uses PM_GameSmoothed. Smoothed pawns blend toward
// their actor's position on every frame. Use them if you expect an object to move continuously,
// and need that movement to appear smooth.

export class TestPawn extends mix(Pawn).with(PM_GameRendered, PM_GameSmoothed) {
    constructor(actor) {
        super(actor);

        this.setGameObject({ type: 'primitiveCube' });
    }
}
TestPawn.register("TestPawn"); // All Worldcore pawns must be registered after they're defined.

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyViewRoot extends GameViewRoot {

    static viewServices() {
        return [GameInputManager].concat(super.viewServices());
    }
}
