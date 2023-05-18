// Tutorial 7 Views

// Identical code to the view in the previous tutorial.

import { Pawn, mix, m4_rotation, m4_translation, m4_multiply, toRad, m4_getRotation, m4_getTranslation, GetViewService } from "@croquet/worldcore-kernel"; // eslint-disable-line import/no-extraneous-dependencies
import { GameInputManager, GameViewRoot, PM_GameSpatial, PM_GameSmoothed, PM_GameRendered } from "../build-tools/sources/unity-bridge";

//------------------------------------------------------------------------------------------
// TestPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class TestPawn extends mix(Pawn).with(PM_GameRendered, PM_GameSmoothed) {

    constructor(actor) {
        super(actor);
        this.useInstance("woodCube");
    }

}
TestPawn.register("TestPawn");

//------------------------------------------------------------------------------------------
// ClickPawn -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ClickPawn extends mix(Pawn).with(PM_GameRendered, PM_GameSmoothed) {

    constructor(actor) {
        super(actor);
        this.useInstance("woodCube");
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

        this.setGameObject({ type: 'groundPlane' });
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

export class ColorPawn extends mix(Pawn).with(PM_GameRendered, PM_GameSmoothed) {

    constructor(actor) {
        super(actor);

        this.setGameObject({ type: 'primitiveCube', color: this.actor.color });

        this.listen("colorSet", this.onColorSet);
    }

    onColorSet() {
        this.sendToUnity('setColor', this.actor.color);
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
