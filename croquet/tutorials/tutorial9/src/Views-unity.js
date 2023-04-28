// Tutorial 9 Views

// All the code specific to this tutorial is in the definition of AvatarPawn.

import { Pawn, mix, toRad, q_axisAngle } from "@croquet/worldcore-kernel"; // eslint-disable-line import/no-extraneous-dependencies
import { GameInputManager, GameViewRoot, PM_GameSpatial, PM_GameSmoothed, PM_GameAvatar, PM_GameRendered, PM_GameCamera } from "../../tutorials-common/unity-bridge";


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

        this.subscribe("input", "pointerDown", this.doPointerDown);
    }

    doPointerDown(e) {
        // e has a list of hits { pawn, xyz, layers }
        if (e.hits[0].pawn === this) this.say("kill");
    }

}
ClickPawn.register("ClickPawn");

//------------------------------------------------------------------------------------------
//-- BasePawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// When making each avatar pawn clickable (see below) we specify that it belongs to the
// "avatar" layer. Every hit-test event includes, for each hit object, any layers to which
// the object was assigned.  We use that to filter the hits list to find any avatar that
// was hit by the raycast.
//
// When you click on another avatar, and that avatar doesn't have a driver, you "possess"
// it by parking your current avatar and starting to drive the new one.

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
        if (pawn === this) this.say("spawn", xyz);
        else {
            // base wasn't the first hit; look for an avatar (even if behind other
            // objects)
            const avatarHits = e.hits.filter(hit => hit.layers.includes('avatar'));
            if (avatarHits.length) this.possess(avatarHits[0].pawn);
        }
    }

    possess(pawn) {
        if (pawn.actor.driver === this.viewId) return; // it's already our avatar
        if (pawn.actor.driver) return; // it's already someone else's

        this.publish("app", "askToDrive", { actor: pawn.actor, viewId: this.viewId }); // can be rejected if someone else gets in first
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
// The "MouseLookAvatar" component that we assign to each avatar handles not just keystrokes
// but also the pointer: when you hold down the right mouse button, you are in direct control
// of the pitch of the camera and the yaw of the avatar object it is attached to. The yaw
// updates are reported to all clients, while the pitch remains a private property of the
// local camera.
//
// Every pawn has an update() method that's called every frame. We use each AvatarPawn's
// update() to respond to changes in the driving state, grabbing or releasing the camera
// appropriately.

export class AvatarPawn extends mix(Pawn).with(PM_GameRendered, PM_GameSmoothed, PM_GameAvatar, PM_GameCamera) {

    constructor(actor) {
        super(actor);

        this.setGameObject({ type: 'tallBox', color: this.actor.color, extraComponents: "MouseLookAvatar" });
        this.makeClickable("avatar");

        this.listen("colorSet", this.onColorSet);
        this.subscribe("app", "avatarAssigned", this.avatarAssigned);

        this.cameraRotation = q_axisAngle([1, 0, 0], toRad(5));
        this.cameraTranslation = [0, 5, -10];
    }

    onColorSet() {
        this.sendToUnity('setColor', this.actor.color);
    }

    avatarAssigned(data) {
        // If the viewId that was previously driving this avatar has been granted a
        // request to drive a different one, reset our driver.
        const { actor, viewId } = data;
        if (this.actor !== actor && this.actor.driver === viewId) this.set({ driver: null });
    }

    update(time, delta) {
        super.update(time, delta);

        if (this.driving && !this.hasGrabbedCamera) this.grabCamera();
        if (!this.driving && this.hasGrabbedCamera) this.releaseCamera();
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
