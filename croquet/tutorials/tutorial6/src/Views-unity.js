// Tutorial 6 Views

// NB: the THREE version uses instanced rendering.  Here as a placeholder we just
// use our mechanism for referring to named Unity prefabs.

import { Pawn, mix, m4_rotation, m4_translation, m4_multiply, toRad, m4_getRotation, m4_getTranslation, GetViewService } from "@croquet/worldcore-kernel"; // eslint-disable-line import/no-extraneous-dependencies
import { GameInputManager, GameViewRoot, PM_GameSpatial, PM_GameSmoothed, PM_GameRendered } from "../../tutorials-common/unity-bridge";

//------------------------------------------------------------------------------------------
// TestPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// useInstance() takes a string value that is matched up against the short names of prefabs
// in Unity's default local group of Addressables. For efficiency of loading assets at start
// of play, only those addressables tagged with the application name (set in the Croquet Bridge
// object) are loaded.

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

// In addition to using an instance (another one of the prefabs), ClickPawn also
// registers for click detection by the Unity raycaster.

export class ClickPawn extends mix(Pawn).with(PM_GameRendered, PM_GameSmoothed) {

    constructor(actor) {
        super(actor);
        this.useInstance("woodCube");
        this.makeClickable();
    }

}
ClickPawn.register("ClickPawn");

//------------------------------------------------------------------------------------------
//-- BasePawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// On a pointerDown event, our default Unity InputAdapter performs a raycast and sends an
// event listing all game objects (if they have been set as clickable) along that ray,
// sorted by increasing distance.
// BasePawn handles all reaction to those events. If BasePawn itself is clicked on, it
// sends an event to the BaseActor, telling it to spawn a new child. But if a ClickPawn
// was clicked on, the ClickPawn tells its actor to delete itself.
//
// Raycasting happens entirely in the view, with the pawns routing the appropriate events
// to the model through the reflector. Clicking on a pawn on any client therefore kills
// its actor everywhere. Requesting a spawn on one client spawns an actor on all the clients.

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

        this.setGameObject({ type: 'woodCube', color: this.actor.color });

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
