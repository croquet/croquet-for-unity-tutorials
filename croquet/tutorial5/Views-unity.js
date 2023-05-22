// Tutorial 5 Views

import { Pawn, mix } from "@croquet/worldcore-kernel";
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

// We create a new pawn that uses the color property. For this property, our work in
// communicating its value to Unity is taken care of by the PM_GameMaterial mixin.
//
// If a pawn wants to know the value of a property held by its actor, it can read directly
// from the actor object at any time. However, the pawn *MUST NEVER* overwrite the actor's value.
//
// say() and listen() are versions of publish/subscribe limited in scope to a single actor/pawn pair.
//
// When you set() a property on an actor it automatically publishes the event "propertynameSet" using
// local scope. The PM_GameMaterial mixin listens for "colorSet" so it can tell Unity to update the game object to
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
