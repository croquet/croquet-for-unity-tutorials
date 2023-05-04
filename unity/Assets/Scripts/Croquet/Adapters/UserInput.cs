using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
using UnityEngine.InputSystem.Utilities;

namespace Croquet.Adapters
{
    public class UserInput : MonoBehaviour
    {
        public bool SendAllKeysAsEvents = true;
        public bool SendPointerEvents = true;
        public bool SendPointerHitEvents = true;
        public Camera userCamera;
        public float PointerHitDistance = 10.0f;

        private UserInputActions inputActions;
        private InputAction keyboard;
        private InputAction pointer;
        private InputAction pointerValue;

        void Awake()
        {
            inputActions = new UserInputActions();

            if (SendAllKeysAsEvents)
            {
                // Fire an Event for all Keys Up and Down
                InputSystem.onEvent.ForDevice<Keyboard>().SelectMany(GetControlsDown).Call(SendKeyDown);
                InputSystem.onEvent.ForDevice<Keyboard>().SelectMany(GetControlsUp).Call(SendKeyUp);
            }
        }

        private IEnumerable<InputControl> GetControlsDown(InputEventPtr eventPtr)
        {
            if (eventPtr.type != StateEvent.Type && eventPtr.type != DeltaStateEvent.Type)
                yield break;

            foreach (var control in eventPtr.EnumerateControls(InputControlExtensions.Enumerate.IgnoreControlsInCurrentState))
            {
                if (control.IsPressed())
                    continue;

                yield return control;
            }
        }

        private IEnumerable<InputControl> GetControlsUp(InputEventPtr eventPtr)
        {
            if (eventPtr.type != StateEvent.Type && eventPtr.type != DeltaStateEvent.Type)
                yield break;

            foreach (var control in eventPtr.EnumerateControls(InputControlExtensions.Enumerate.IgnoreControlsInCurrentState))
            {
                if (!control.IsPressed())
                    continue;

                yield return control;
            }
        }

        void OnEnable()
        {
            inputActions.Enable();

            // KEYBOARD
            keyboard = inputActions.User.Keyboard;

            // POINTER - Touch and Mouse
            pointer = inputActions.User.PointerEvent;
            pointerValue = inputActions.User.PointerValue;

            if (SendPointerEvents)
            {
                pointer.started += SendPointerDown;

                pointer.canceled += SendPointerUp;
                pointer.Enable();
            }
        }

        private void Update()
        {
            if (SendPointerHitEvents)
            {
                if (pointer.WasPressedThisFrame())
                {
                    SendPointerHit();
                }
            }
        }

        void SendKeyDown(InputControl control)
        {
            // Debug.Log($"[INPUT] KEYDOWN: " + control.name);

            CroquetBridge.SendCroquet("event", "keyDown", control.name);
        }

        void SendKeyUp(InputControl control)
        {
            //Debug.Log($"[INPUT] KEYUP: " + control.name);

            CroquetBridge.SendCroquet("event", "keyUp", control.name);
        }

        void SendPointerDown(InputAction.CallbackContext callbackContext)
        {
            Debug.Log("[INPUT] Pointer Down");
            //CroquetBridge.SendToCroquet("event", "pointerDown");
        }

        void SendPointerUp(InputAction.CallbackContext callbackContext)
        {
            Debug.Log("[INPUT] Pointer Up");
            //CroquetBridge.SendToCroquet("event", "pointerUp");
        }

        void SendPointerHit()
        {
            // Debug.Log($"[INPUT] Looking for pointer hit");

            // TODO: raycast against only an interactive-only bitmask.
            List<string> clickDetails = new List<string>();
            Ray ray = ((userCamera ? userCamera : Camera.main)!).ScreenPointToRay(Pointer.current.position.ReadValue());
            RaycastHit[] hits = Physics.RaycastAll(ray, PointerHitDistance);
            Array.Sort(hits, (x,y) => x.distance.CompareTo(y.distance));
            foreach (RaycastHit hit in hits)
            {
                // for each Unity hit, only register a click if the hit object has
                // a CroquetGameObject component and has been registered as clickable.
                // create a list with each clicked object handle, click location,
                // and click layers that the object has been registered with (if any).
                Transform objectHit = hit.transform;
                while (true)
                {
                    CroquetGameObject cgo = objectHit.gameObject.GetComponent<CroquetGameObject>();
                    if (cgo)
                    {
                        if (cgo.clickable)
                        {
                            // collect id, hit.x, hit.y, hit.z[, layer1, layer2 etc]
                            List<string> oneHit = new List<string>();
                            oneHit.Add(cgo.croquetGameHandle);
                            Vector3 xyz = hit.point;
                            oneHit.Add(xyz.x.ToString());
                            oneHit.Add(xyz.y.ToString());
                            oneHit.Add(xyz.z.ToString());
                            oneHit.AddRange(cgo.clickLayers);

                            clickDetails.Add(String.Join(',', oneHit.ToArray()));
                        }

                        break;
                    }

                    objectHit = objectHit.parent;
                    if (!objectHit) break;
                }
            }

            if (clickDetails.Count > 0)
            {
                List<string> eventArgs = new List<string>();
                eventArgs.Add("event");
                eventArgs.Add("pointerHit");
                eventArgs.AddRange(clickDetails);
                CroquetBridge.SendCroquet(eventArgs.ToArray());
            }
        }

    }
}
