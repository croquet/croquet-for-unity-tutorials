// Tutorial 7 Views

// Identical code to the view in the previous tutorial.

import { Pawn, mix } from "@croquet/worldcore-kernel";
import { GameInputManager, GameViewRoot, PM_GameSpatial, PM_GameSmoothed, PM_GameRendered, PM_GameMaterial } from "../build-tools/sources/unity-bridge";

//------------------------------------------------------------------------------------------
// TestPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class TestPawn extends mix(Pawn).with(PM_GameRendered, PM_GameSmoothed) {

    constructor(actor) {
        super(actor);
        this.setGameObject({ type: "woodCube" });
    }

}
TestPawn.register("TestPawn");

//------------------------------------------------------------------------------------------
// ClickPawn -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ClickPawn extends mix(Pawn).with(PM_GameRendered, PM_GameSmoothed) {

    constructor(actor) {
        super(actor);
        this.setGameObject({ type: "woodCube" });
        this.makeInteractable();
    }

}
ClickPawn.register("ClickPawn");

//------------------------------------------------------------------------------------------
//-- BasePawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BasePawn extends mix(Pawn).with(PM_GameRendered, PM_GameSpatial) {

    constructor(actor) {
        super(actor);

        this.setGameObject({ type: "groundPlane" });
        this.makeInteractable();

        this.subscribe("input", "pointerHit", this.doPointerHit);
    }

    doPointerHit(e) {
        // e has a list of hits { pawn, xyz, layers }
        const { pawn, xyz } = e.hits[0];
        if (pawn === this) {
            this.say("spawn", xyz);
        } else {
            pawn.say("kill");
        }
    }

}
BasePawn.register("BasePawn");

//------------------------------------------------------------------------------------------
// ColorPawn -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ColorPawn extends mix(Pawn).with(PM_GameRendered, PM_GameSmoothed, PM_GameMaterial) {

    constructor(actor) {
        super(actor);

        this.setGameObject({ type: 'woodCube'});
    }
}
ColorPawn.register("ColorPawn");

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyViewRoot extends GameViewRoot {
    static viewServices() {
        return [GameInputManager].concat(super.viewServices());
    }
}
