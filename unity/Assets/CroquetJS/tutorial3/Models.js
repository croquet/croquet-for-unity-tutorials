// Tutorial 3 Models

import { Actor, mix, AM_Spatial, AM_Behavioral } from "@croquet/worldcore-kernel"; // eslint-disable-line import/no-unresolved
import { GameModelRoot } from "@croquet/game-models"; // eslint-disable-line import/no-unresolved

//------------------------------------------------------------------------------------------
// ParentActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// AM_Behavioral lets us attach behaviors to actors to control them.

class ParentActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {
    get gamePawnType() { return "smoothedCube" }

    init(options) {
        super.init(options);
        this.subscribe("input", "zDown", this.moveLeft);
        this.subscribe("input", "xDown", this.moveRight);
    }

    moveLeft() {
        console.log("left");
        const translation = this.translation;
        translation[0] += -1;
        this.set({translation});
    }

    moveRight() {
        console.log("right");
        const translation = this.translation;
        translation[0] += 1;
        this.set({translation});

    }
}
ParentActor.register('ParentActor');

//------------------------------------------------------------------------------------------
// ChildActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// We also define another actor that doesn't subscribe to input events.

class ChildActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {
    get gamePawnType() { return "smoothedCube" }
}
ChildActor.register('ChildActor');

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// After we create the parent and the child we give each one a different spin behavior.
// When you start behaviors you can pass in options with the behavior name.

export class MyModelRoot extends GameModelRoot {

    init(options) {
        super.init(options);
        console.log("Start model root!");
        const parent = ParentActor.create({translation:[0,0,0]});
        const child = ChildActor.create({parent, translation:[0,2,0]});

        parent.behavior.start({name: "SpinBehavior", axis: [0,0,1], tickRate:500});
        child.behavior.start({name: "SpinBehavior", axis: [0,-1,0], speed: 3});
    }

}
MyModelRoot.register("MyModelRoot");
