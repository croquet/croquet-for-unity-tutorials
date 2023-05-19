// Tutorial 1 Views

// Every object in Worldcore is represented by an actor/pawn pair. Spawning an actor
// automatically instantiates a corresponding pawn. The actor is replicated
// across all clients, while the pawn is unique to each client.

import { Pawn, mix } from "@croquet/worldcore-kernel"; // eslint-disable-line import/no-extraneous-dependencies
import { GameInputManager, PM_GameRendered, PM_GameSpatial, GameViewRoot } from "../build-tools/sources/unity-bridge";

//------------------------------------------------------------------------------------------
// TestPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Here we define a pawn for our actor to use. It uses the PM_GameRendered and PM_GameSpatial
// mixins. PM_GameSpatial allows the pawn to track the position of any AM_Spatial actor it's
// attached to.

// PM_GameRendered gives the pawn an interface to the Unity bridge. In the pawn's constructor
// we ask to create a simple Unity-side game object. When the pawn's actor moves, these mixins
// will make sure the game object tracks it.

export class TestPawn extends mix(Pawn).with(PM_GameRendered, PM_GameSpatial) {
    constructor(actor) {
        super(actor);

        this.setGameObject({ type: 'primitiveCube'});
    }
}
TestPawn.register("TestPawn"); // All Worldcore pawns must be registered after they're defined.

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The view root has a list of global services it creates on start-up. In this case we're adding
// GameInputManager to the default view services started for the Unity bridge.

// Note that pawns are never explicitly instantiated. Worldcore automatically creates and destroys pawns
// as actors come in and out of existence. When you join a session already in progress, all objects
// will be automatically synched with the shared state of the world.

// The Unity game camera will be placed according to its transform settings in the editor.

export class MyViewRoot extends GameViewRoot {

    static viewServices() {
        return [GameInputManager].concat(super.viewServices());
    }
}
