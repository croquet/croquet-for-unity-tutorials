// Tutorial 6 Views

// NB: the THREE version uses instanced rendering.  Here as a placeholder we just
// use our mechanism for referring to named Unity prefabs.

import { Pawn, mix } from "@croquet/worldcore-kernel";
import { GameInputManager, GameViewRoot, PM_GameSpatial, PM_GameSmoothed, PM_GameRendered, PM_GameMaterial } from "../build-tools/sources/unity-bridge";

//------------------------------------------------------------------------------------------
// TestPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// the 'type' element of the game-object spec takes a string value that can either be a
// primitive (primitiveCube, primitiveSphere etc), or is matched up against the short
// names of prefabs in Unity's default local group of Addressables. For efficiency,
// only those addressables tagged with the application name (set in the Croquet Bridge
// component) are made available for the app to load.

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

// In addition to using a prefab, ClickPawn also registers for click detection by
// the Croquet Interactable system on the Unity side.

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

// On a pointerDown event, our default Croquet Interactable performs a raycast and sends an
// event listing all game objects (if they have been set as interactable) along that ray,
// sorted by increasing distance.
// BasePawn handles all reaction to those events. If BasePawn itself is clicked on, it
// sends an event to the BaseActor, telling it to spawn a new child. But if a ClickPawn
// was clicked on, the ClickPawn tells its actor to delete itself.
//
// Hit-handling happens entirely in the view, with the pawns routing the appropriate events
// to the model through the reflector. Clicking on a pawn on any client therefore kills
// its actor everywhere. Requesting a spawn on one client spawns an actor on all the clients.

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
