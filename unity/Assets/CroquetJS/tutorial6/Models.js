// Tutorial 6 Models

import { Actor, mix, AM_Spatial, AM_Behavioral } from "@croquet/worldcore-kernel";
import { GameModelRoot } from "@croquet/game-models";

//------------------------------------------------------------------------------------------
// -- BaseActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// We added a ground plane called BaseActor. Its pawn includes the Interactable
// mixin, so the actor receives pointerHit events from Unity.

// A pointerHit event lists all interactable actors whose pawns were on a raycast
// triggered by the pointer.  In this example, the BaseActor handles all pointerHit
// events and decides what to do in each case.

// If the first hit is the BaseActor itself, it spawns a new TestActor and assigns
// it a "layers" property value - an array of strings - that will be provided
// if that actor appears in a future pointerHit event.

// If the first hit target is not the BaseActor, but another actor with a layer entry
// showing that it was spawned by the BaseActor, we publish a "kill" event
// that the target will respond to by destroying itself.
class BaseActor extends mix(Actor).with(AM_Spatial) {
    get gamePawnType() { return "groundPlane" }

    init(options) {
        super.init(options);
        this.subscribe("input", "pointerHit", this.doPointerHit);
    }

    doPointerHit(e) {
        // e has a list of hits { actor, xyz, layers }
        const { actor, xyz, layers } = e.hits[0];
        if (actor === this) {
            this.doSpawn(xyz);
        } else if (layers.includes("spawnedByBase")) {
            this.publish(actor.id, "kill");
        }
    }

    doSpawn(xyz) {
        TestActor.create({ parent: this, layers: ["spawnedByBase"], translation: xyz });
    }

}
BaseActor.register('BaseActor');

//------------------------------------------------------------------------------------------
//-- TestActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// TestActor now uses interactableCube, which supports hit-testing on the
// Unity side.  It also subscribes to any "kill" event published with the actor's
// own id as scope, and responds by destroying itself.

class TestActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {
    get gamePawnType() { return "interactableCube" }

    init(options) {
        super.init(options);
        this.subscribe(this.id, "kill", this.destroy);
    }

}
TestActor.register('TestActor');

//------------------------------------------------------------------------------------------
//-- ColorActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class ColorActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {
    get gamePawnType() { return "colorableCube" }

    get color() { return this._color || [0.5,0.5,0.5] }

}
ColorActor.register('ColorActor');

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyModelRoot extends GameModelRoot {

    init(options) {
        super.init(options);
        console.log("Start model root!");
        this.base = BaseActor.create();
        this.parent = TestActor.create({parent: this.base, translation:[0,1,0]});
        this.child = ColorActor.create({parent: this.parent, translation:[0,0,-2]});

        this.parent.behavior.start({name: "SpinBehavior", axis: [0,-1,0], tickRate:500});
        this.child.behavior.start({name: "SpinBehavior", axis: [0,0,1], speed: 3});

        this.subscribe("input", "cDown", this.colorChange);
    }

    colorChange() {
        const color = [this.random(), this.random(), this.random()];
        this.child.set({color});
    }

}
MyModelRoot.register("MyModelRoot");
