using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// add this using directive
using UnityEngine.InputSystem;

public class InputSystemEvents : MonoBehaviour
{
    private Actions inputActions;
    private InputAction move;

    void Awake()
    {
        // create a new input action
        inputActions = new Actions();
    }

    private void OnEnable()
    {
        inputActions.Enable();

        // cache a reference to this input action
        // so we can use it in an update loop
        move = inputActions.Player.Move;
        // enable with _function_ or it will not work
        move.Enable();
        // Start, held, and End
        inputActions.Player.Move.started += DoMoveStart;
        inputActions.Player.Move.performed += DoMoveChanged;
        inputActions.Player.Move.canceled += DoMoveEnd;

        // subscribe when the Fire button is "performed"
        inputActions.Player.Fire.Enable();
        inputActions.Player.Fire.performed += DoFire;
    }

    void DoFire(InputAction.CallbackContext callbackContext)
    {
        Debug.Log("Fire Pressed!");
    }

    private void OnDisable()
    {
        // Clean up, if the controls are needed elsewhere
        move.Disable();
        inputActions.Player.Fire.Disable();

        inputActions.Disable();
    }

    void Update()
    {
        // read the value as Vec2 continuously
        //Debug.Log("Movement value:" + move.ReadValue<Vector2>());
    }

    void DoMoveStart(InputAction.CallbackContext callbackContext)
    {
        Debug.Log("Move Start!");

    }

    void DoMoveChanged(InputAction.CallbackContext callbackContext)
    {
        // this will only trigger once for button types
        Debug.Log("Move Changed Value!");
    }

    void DoMoveEnd(InputAction.CallbackContext callbackContext)
    {
        Debug.Log("Move End!");
    }
}
