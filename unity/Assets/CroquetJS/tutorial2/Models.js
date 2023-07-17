// Tutorial 2 Models

import { ModelRoot, Actor, mix, AM_Spatial, q_axisAngle, q_multiply } from "@croquet/worldcore-kernel";

//------------------------------------------------------------------------------------------
// ParentActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class ParentActor extends mix(Actor).with(AM_Spatial) {
    get gamePawnType() { return "smoothedCube" }

    init(options) {
        super.init(options);
        this.subscribe("input", "zDown", this.moveLeft);
        this.subscribe("input", "xDown", this.moveRight);
    }

    moveLeft() {
        // console.log("left");
        const translation = this.translation;
        translation[0] += -1;
        this.set({translation});
    }

    moveRight() {
        // console.log("right");
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

class ChildActor extends mix(Actor).with(AM_Spatial) {
    get gamePawnType() { return "smoothedCube" }

    init(options) {
        super.init(options);
        this.rate = Math.random()*0.1+0.1;
        this.doSpin();
    }

    doSpin() {
        const q = q_axisAngle([0,1,0], this.rate);
        const rotation = q_multiply(this.rotation, q);
        this.set({rotation});
        this.future(100).doSpin(); // this is where the magic happens
    }
}
ChildActor.register('ChildActor');

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// We create three actors this time. A parent and two children. A child's translation is
// performed in relation to its parent.

export class MyModelRoot extends ModelRoot {

    init(options) {
        super.init(options);
        console.log("Start model root!");
        const parent = ParentActor.create({translation:[0,0,0]});
        const child = ChildActor.create({parent: parent, translation:[0,0,3]}); // eslint-disable-line object-shorthand
        const _grandchild = ChildActor.create({parent: child, translation:[0,2,0]});
    }

}
MyModelRoot.register("MyModelRoot");
