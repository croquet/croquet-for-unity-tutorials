// Tutorial 7 Views

// Identical code to the view in the previous tutorial.

import { Pawn, mix, m4_rotation, m4_translation, m4_multiply, toRad, m4_getRotation, m4_getTranslation, GetViewService } from "@croquet/worldcore-kernel"; // eslint-disable-line import/no-extraneous-dependencies
import { GameInputManager, GameViewRoot, PM_GameSpatial, PM_GameSmoothed, PM_GameRendered } from "../../tutorials-common/unity-bridge";

//------------------------------------------------------------------------------------------
// TestPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class TestPawn extends mix(Pawn).with(PM_GameRendered, PM_GameSmoothed) {

    constructor(actor) {
        super(actor);
        this.useInstance("cyanBox");
    }

}
TestPawn.register("TestPawn");

//------------------------------------------------------------------------------------------
// ClickPawn -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ClickPawn extends mix(Pawn).with(PM_GameRendered, PM_GameSmoothed) {

    constructor(actor) {
        super(actor);
        this.useInstance("magentaBox");
        this.makeClickable();
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
        this.makeClickable();

        this.subscribe("input", "pointerDown", this.doPointerDown);
    }

    doPointerDown(e) {
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

    onStart() {
        this.pawnManager = GetViewService('GameEnginePawnManager');
        this.placeCamera();
    }

    placeCamera() {
        const pitchMatrix = m4_rotation([1, 0, 0], toRad(45));
        const yawMatrix = m4_rotation([0, 1, 0], toRad(30));

        let cameraMatrix = m4_translation([0, 0, -50]);
        cameraMatrix = m4_multiply(cameraMatrix, pitchMatrix);
        cameraMatrix = m4_multiply(cameraMatrix, yawMatrix);

        const translation = m4_getTranslation(cameraMatrix);
        const rotation = m4_getRotation(cameraMatrix);
        this.pawnManager.updateGeometry('camera', { translationSnap: translation, rotationSnap: rotation });
    }
}
