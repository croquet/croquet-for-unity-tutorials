// Tutorial 5 Views

import { Pawn, mix, GetViewService, m4_rotation, m4_translation, m4_multiply, m4_getTranslation, m4_getRotation, toRad } from "@croquet/worldcore-kernel"; // eslint-disable-line import/no-extraneous-dependencies
import { GameInputManager, GameViewRoot, PM_GameSmoothed, PM_GameRendered, PM_GameMaterial } from "../build-tools/sources/unity-bridge";

//------------------------------------------------------------------------------------------
// TestPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class TestPawn extends mix(Pawn).with(PM_GameRendered, PM_GameSmoothed) {
    constructor(actor) {
        super(actor);

        this.setGameObject({ type: 'primitiveCube'});
    }
}
TestPawn.register("TestPawn");

//------------------------------------------------------------------------------------------
// ColorPawn -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// We create a new pawn that uses the color property. When the pawn creates its game object,
// it includes the actor's current color value.
//
// (A pawn can read from its actor at any time. However, it *MUST NEVER* write to it.)
//
// say() and listen() are versions of publish/subscribe limited in scope to a single actor/pawn pair.
//
// When you set() a property on an actor it automatically publishes the event "propertynameSet" using
// local scope. Our pawn listens for "colorSet" so it can tell Unity to update the game object to
// the new color.

export class ColorPawn extends mix(Pawn).with(PM_GameRendered, PM_GameSmoothed, PM_GameMaterial) {

    constructor(actor) {
        super(actor);

        this.setGameObject({ type: 'primitiveCube'});
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
