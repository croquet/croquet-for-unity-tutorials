// Tutorial 8 Views

// All the code specific to this tutorial is in the definition of AvatarPawn.

import { Pawn, mix } from "@croquet/worldcore-kernel";
import { GameInputManager, GameViewRoot, PM_GameSpatial, PM_GameSmoothed, PM_GameAvatar, PM_GameRendered, PM_GameMaterial } from "../build-tools/sources/unity-bridge";


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

// In this example we set up the BasePawn and all ClickPawn instances to subscribe separately
// to click events. Every click will be sent to all subscribers; it's up to each one to decide
// whether to act on it.

export class ClickPawn extends mix(Pawn).with(PM_GameRendered, PM_GameSmoothed) {

    constructor(actor) {
        super(actor);
        this.setGameObject({ type: "woodCube" });
        this.makeInteractable();

        this.subscribe("input", "pointerHit", this.doPointerHit);
    }

    doPointerHit(e) {
        // e has a list of hits { pawn, xyz, layers }
        if (e.hits[0].pawn === this) this.say("kill");
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
        if (pawn === this) this.say("spawn", xyz);
    }

}
BasePawn.register("BasePawn");

//------------------------------------------------------------------------------------------
// ColorPawn -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ColorPawn extends mix(Pawn).with(PM_GameRendered, PM_GameSmoothed, PM_GameMaterial) {

    constructor(actor) {
        super(actor);

        this.setGameObject({ type: 'primitiveCube'});
    }

}
ColorPawn.register("ColorPawn");

//------------------------------------------------------------------------------------------
// AvatarPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// We've added the mixin PM_GameAvatar. Previously when we subscribed to control inputs, we've done
// it directly in the model, but since we only want one person to control the avatar, we use
// the AvatarPawn as a go-between. An AvatarPawn exists for the avatar on every client, but
// only one should accept control inputs.
//
// A crucial behavior provided by PM_GameAvatar is for a client to "drive" the avatar that is
// currently assigned to it. Driving means that the client updates the avatar position in
// its own view instantly (without a round-trip journey to the reflector), while also emitting
// position-update events that travel via the reflector to all clients. The originating pawn
// notes that it is being driven, and ignores these updates; all other clients update their
// local manifestations of the same pawn, using view smoothing.
//
// When initializing the game object for the avatar we specify a specialized Unity component
// "OverheadAvatar" that watches for movement keys (W, A, S, D or arrows), moves the game
// object immediately, and sends over the bridge the events that will be used by other
// clients to synch to the avatar's position updates.

export class AvatarPawn extends mix(Pawn).with(PM_GameRendered, PM_GameSmoothed, PM_GameAvatar, PM_GameMaterial) {

    constructor(actor) {
        super(actor);

        this.setGameObject({ type: 'woodColumn', extraComponents: "OverheadAvatar" });

        // send initial position, in case this object is driven locally and
        // will therefore be ignoring updates from the model
        this.updateGeometry({ translationSnap: this.translation, rotationSnap: this.rotation, scaleSnap: this.scale });
    }

}
AvatarPawn.register("AvatarPawn");

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyViewRoot extends GameViewRoot {

    static viewServices() {
        return [GameInputManager].concat(super.viewServices());
    }
}
