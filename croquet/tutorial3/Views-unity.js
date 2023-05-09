// Tutorial 3 Views

// Identical code to the view in the previous tutorial.

import { Pawn, mix, GetViewService, m4_rotation, m4_translation, m4_multiply, m4_getTranslation, m4_getRotation, toRad } from "@croquet/worldcore-kernel"; // eslint-disable-line import/no-extraneous-dependencies
import { GameInputManager, GameViewRoot, PM_GameSmoothed, PM_GameRendered } from "../build-tools/sources/unity-bridge";


//------------------------------------------------------------------------------------------
// TestPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class TestPawn extends mix(Pawn).with(PM_GameRendered, PM_GameSmoothed) {
    constructor(actor) {
        super(actor);

        this.setGameObject({ type: 'primitiveCube', color: [1, 1, 0] });
    }
}
TestPawn.register("TestPawn");

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyViewRoot extends GameViewRoot {
    static viewServices() {
        return [GameInputManager].concat(super.viewServices());
    }

    onStart() {
        this.pawnManager = GetViewService('GameEnginePawnManager');
        this.placeCamera();
    }

    placeCamera() {
        const pitchMatrix = m4_rotation([1, 0, 0], toRad(20));
        const yawMatrix = m4_rotation([0, 1, 0], toRad(30));

        let cameraMatrix = m4_translation([0, 0, -15]);
        cameraMatrix = m4_multiply(cameraMatrix, pitchMatrix);
        cameraMatrix = m4_multiply(cameraMatrix, yawMatrix);

        const translation = m4_getTranslation(cameraMatrix);
        const rotation = m4_getRotation(cameraMatrix);
        this.pawnManager.updateGeometry('camera', { translationSnap: translation, rotationSnap: rotation });
    }
}
