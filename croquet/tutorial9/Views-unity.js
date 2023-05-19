// Tutorial 9 Views

// All the code specific to this tutorial is in the definition of AvatarPawn.

import { Pawn, mix, toRad, q_axisAngle, v3_sub, v3_normalize, v3_scale } from "@croquet/worldcore-kernel"; // eslint-disable-line import/no-extraneous-dependencies
import { GameInputManager, GameViewRoot, PM_GameSpatial, PM_GameSmoothed, PM_GameAvatar, PM_GameRendered, PM_GameCamera } from "../build-tools/sources/unity-bridge";


//------------------------------------------------------------------------------------------
// TestPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class TestPawn extends mix(Pawn).with(PM_GameRendered, PM_GameSmoothed) {

    constructor(actor) {
        super(actor);
        this.useAddressable("woodCube");
    }

}
TestPawn.register("TestPawn");

//------------------------------------------------------------------------------------------
// ClickPawn -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ClickPawn extends mix(Pawn).with(PM_GameRendered, PM_GameSmoothed) {

    constructor(actor) {
        super(actor);
        this.useAddressable("woodCube");
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

// When making each avatar pawn interactable (see below) we specify that it belongs to the
// "avatar" layer. Every hit-test event includes, for each hit object, any layers to which
// the object was assigned.  We use that to filter the hits list to find any avatar that
// was hit by the raycast.
//
// If you click another avatar with the left mouse button it's given a shove away from you,
// even if it's controlled by another user.

export class BasePawn extends mix(Pawn).with(PM_GameRendered, PM_GameSpatial) {

    constructor(actor) {
        super(actor);

        this.useAddressable("groundPlane");
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
// AvatarPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// We added the PM_GameCamera mixin to our avatar. The camera follows the values of the pawn's
// cameraRotation and cameraTranslation properties, allowing us to control its position
// relative to the pawn. It automatically tracks the pawn's movement so our view changes as
// our avatar moves.
//
// The "MouseLookAvatar" component that we assign to the user's avatar handles not just keystrokes
// but also the pointer: when you hold down the right mouse button, you are in direct control
// of the pitch of the camera and the yaw of the avatar object it is attached to. The yaw
// updates are reported to all clients, while the pitch remains a private property of the
// local camera.

export class AvatarPawn extends mix(Pawn).with(PM_GameRendered, PM_GameSmoothed, PM_GameAvatar, PM_GameCamera) {

    constructor(actor) {
        super(actor);

        this.setGameObject({ type: 'woodColumn', color: this.actor.color, extraComponents: this.isMyAvatar ? "MouseLookAvatar" : "" });
        this.makeInteractable("avatar");

        this.listen("colorSet", this.onColorSet);

        if (this.driving) {
            this.cameraRotation = q_axisAngle([1, 0, 0], toRad(5));
            this.cameraTranslation = [0, 5, -10];
            this.grabCamera();
            this.subscribe("input", "pointerHit", this.doPointerHit);
        }
    }

    onColorSet() {
        this.sendToUnity('setColor', this.actor.color);
    }

    doPointerHit(e) {
        // e has a list of hits { pawn, xyz, layers }
        // Iff the first hit is in the avatar layer, act on it.
        const { pawn, layers } = e.hits[0];
        if (layers.includes('avatar')) this.shove(pawn);
    }

    shove(pawn) {
        console.log("pawn shove");
        if (pawn === this) return; // You can't shove yourself

        const away = v3_normalize(v3_sub(pawn.translation, this.translation));
        pawn.say("shove", v3_scale(away, 1));
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
