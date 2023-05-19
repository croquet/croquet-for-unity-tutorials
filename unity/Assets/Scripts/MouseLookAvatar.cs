using UnityEngine;
using UnityEngine.InputSystem;

public class MouseLookAvatar : MonoBehaviour
{
    public Camera avatarCamera;
    
    private readonly KeyCode[] keysOfInterest = new KeyCode[]
    {
        KeyCode.W, KeyCode.A, KeyCode.S, KeyCode.D, KeyCode.UpArrow, KeyCode.LeftArrow, KeyCode.DownArrow,
        KeyCode.RightArrow
    };

    private int fore = 0;
    private int back = 0;
    private int left = 0;
    private int right = 0;

    private float yaw = 0;
    private float yawDelta = 0;
    private float pitch = 0;

    private string croquetHandle;    
    private CroquetAvatarComponent croquetAvatarComponent;

    private bool isActiveAvatarLastFrame = false;
    
    void Start()
    {
        croquetHandle = GetComponent<CroquetEntityComponent>().croquetHandle;
        croquetAvatarComponent = gameObject.GetComponent<CroquetAvatarComponent>();
        avatarCamera = Camera.main;
    }

    void Update()
    {
        if (croquetAvatarComponent == null || !croquetAvatarComponent.isActiveAvatar)
        {
            isActiveAvatarLastFrame = false;
            return;
        }

        if (!isActiveAvatarLastFrame)
        {
            // being (re)activated.  set the local yaw in accordance with where the
            // object is now facing, and the camera pitch to the value seen on the camera.
            Quaternion q = this.gameObject.transform.localRotation;
            yaw = Mathf.Rad2Deg * Mathf.Atan2(2 * q.y * q.w - 2 * q.x * q.z, 1 - 2 * q.y * q.y - 2 * q.z * q.z);
            q = avatarCamera.transform.localRotation;
            pitch = Mathf.Rad2Deg * Mathf.Atan2(2 * q.x * q.w - 2 * q.y * q.z, 1 - 2 * q.x * q.x - 2 * q.z * q.z);
            // Debug.Log($"MouseLookAvatar initial pitch: {pitch}");
        }

        ProcessPointer();
        ProcessKeyboard();
        Drive();

        isActiveAvatarLastFrame = true;
    }

    void ProcessPointer()
    {
        if (Input.GetMouseButton(1))
        {
            /*
                // from Worldcore tutorial9 (except we don't set camera yaw):
                this.yawDelta += (-0.002 * e.xy[0]);
                this.pitch += (-0.002 * e.xy[1]);
                this.pitch = Math.max(-Math.PI/2, this.pitch);
                this.pitch = Math.min(Math.PI/2, this.pitch);
                const pitchQ = q_axisAngle([1,0,0], this.pitch);
                const yawQ = q_axisAngle([0,1,0], this.yawDelta);
                this.cameraRotation = q_multiply(pitchQ, yawQ);
             */

            // Debug.Log(Pointer.current.delta.ReadValue());
            Vector2 xyDelta = Pointer.current.delta.ReadValue();
            if (xyDelta.x == 0 && xyDelta.y == 0) return;

            // @@ movement ratios currently chosen by trial and error.
            // +ve x delta => mouse moving right => object should spin clockwise when
            // seen from above, which (in Unity) means a +ve rotation around y.
            // +ve y delta => mouse moving up => -ve rotation about x.
            yawDelta += (0.01f * Mathf.Rad2Deg * xyDelta.x); // rotations work in opposite sense
            pitch += (-0.01f * Mathf.Rad2Deg * xyDelta.y);
            pitch = Mathf.Clamp(pitch, -180, 180);
            // Debug.Log($"yawDelta {yawDelta} pitch {pitch}");
            Quaternion pitchQ = Quaternion.AngleAxis(pitch, new Vector3(1, 0, 0));
            //avatarCamera.transform.localRotation = pitchQ;
        }
    }

    void ProcessKeyboard()
    {
        foreach (var keyCode in keysOfInterest)
        {
            if (Input.GetKeyDown(keyCode)) HandleKeyDown(keyCode);
            if (Input.GetKeyUp(keyCode)) HandleKeyUp(keyCode);
        }
    }

    void HandleKeyDown(KeyCode keyCode)
    {
        // Debug.Log($"KeyDown {keyCode}");
        switch (keyCode)
        {
            case KeyCode.UpArrow:
            case KeyCode.W:
                fore = 1; // +ve Z
                break;
            case KeyCode.DownArrow:
            case KeyCode.S:
                back = -1; // -ve Z
                break;
            case KeyCode.LeftArrow:
            case KeyCode.A:
                left = -1;
                break;
            case KeyCode.RightArrow:
            case KeyCode.D:
                right = 1;
                break;
        }
    }

    void HandleKeyUp(KeyCode keyCode)
    {
        switch (keyCode)
        {
            case KeyCode.UpArrow:
            case KeyCode.W:
                fore = 0;
                break;
            case KeyCode.DownArrow:
            case KeyCode.S:
                back = 0;
                break;
            case KeyCode.LeftArrow:
            case KeyCode.A:
                left = 0;
                break;
            case KeyCode.RightArrow:
            case KeyCode.D:
                right = 0;
                break;
        }
    }

    void Drive()
    {
        /*
            // from Worldcore tutorial9:
            this.yaw += this.yawDelta;
            this.yawDelta = 0;
            const yawQ = q_axisAngle([0,1,0], this.yaw);
            const t = v3_scale([this.left + this.right, 0, (this.fore + this.back)], 5 * delta/1000);
            const tt = v3_rotate(t, yawQ);
            const translation = v3_add(this.translation, tt);
            this.positionTo(translation, yawQ);
         */

        if (right + left == 0 && fore + back == 0 && yawDelta == 0) return;

        yaw += yawDelta;
        yawDelta = 0;
        // Debug.Log($"{croquetHandle} yaw: {yaw}");

        Quaternion yawQ = Quaternion.AngleAxis(yaw, new Vector3(0, 1, 0));
        float dt = Time.deltaTime;
        Vector3 t = new Vector3(left + right, 0, fore + back) * (10f * dt);
        Vector3 tt = yawQ * t;
        Transform trans = this.gameObject.transform;
        Vector3 newPos = trans.localPosition + tt;
        trans.localPosition = newPos;
        trans.localRotation = yawQ;

        CroquetSpatialSystem.Instance.SnapObjectTo(croquetHandle, newPos, yawQ);
        CroquetSpatialSystem.Instance.SnapObjectInCroquet(croquetHandle, newPos, yawQ);
    }
}
