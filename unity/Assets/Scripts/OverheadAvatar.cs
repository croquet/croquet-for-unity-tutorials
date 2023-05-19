using UnityEngine;

public class OverheadAvatar : MonoBehaviour
{
    private readonly KeyCode[] keysOfInterest = new KeyCode[] { KeyCode.W, KeyCode.A, KeyCode.S, KeyCode.D, KeyCode.UpArrow, KeyCode.LeftArrow, KeyCode.DownArrow, KeyCode.RightArrow };
    private int fore = 0;
    private int back = 0;
    private int left = 0;
    private int right = 0;

    private string croquetHandle;
    private CroquetAvatarComponent croquetAvatarComponent;
    
    void Start()
    {
        croquetHandle = gameObject.GetComponent<CroquetEntityComponent>().croquetHandle;
        croquetAvatarComponent = gameObject.GetComponent<CroquetAvatarComponent>();
        // Debug.Log($"OverheadAvatar on {croquetHandle}");
    }

    void Update()
    {
        if (croquetAvatarComponent == null || !croquetAvatarComponent.isActiveAvatar)
        {
            return;
        }

        ProcessKeyboard();
        Drive();
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
            // from Worldcore tutorial8:
            const yaw = (this.right+this.left) * -3 * delta/1000;
            const yawQ = q_axisAngle([0,1,0], yaw);
            const rotation = q_multiply(this.rotation, yawQ);
            const t = v3_scale([0, 0, (this.fore + this.back)], 5 * delta/1000);
            const tt = v3_rotate(t, rotation);
            let translation = v3_add(this.translation, tt);
            this.positionTo(translation, rotation);
         */

        if (right + left == 0 && fore + back == 0) return;
        
        float dt = Time.deltaTime;
        Quaternion rotation = transform.localRotation;
        float yaw = (right + left) * -3f * dt;
        Quaternion yawQ = Quaternion.AngleAxis(yaw * Mathf.Rad2Deg, new Vector3(0, -1, 0));
        Quaternion newRot = rotation * yawQ;
        Vector3 t = new Vector3(0, 0, fore + back) * (5f * dt);
        Vector3 tt = newRot * t;
        Vector3 newPos = transform.localPosition + tt;

        CroquetSpatialSystem.Instance.SnapObjectTo(croquetHandle, newPos, newRot);
        CroquetSpatialSystem.Instance.SnapObjectInCroquet(croquetHandle, newPos, newRot);
    }
}
