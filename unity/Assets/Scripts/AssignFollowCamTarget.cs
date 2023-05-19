using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Serialization;

public class AssignFollowCamTarget : MonoBehaviour
{
    public FollowCam followCamToUpdate;
    
    void Start()
    {
        
    }

    // Update is called once per frame
    void Update()
    {
        CroquetAvatarComponent a = CroquetAvatarSystem.Instance.GetActiveAvatarComponent();
        
        if ( a != null)
        {
            followCamToUpdate.target = a.transform;

            enabled = false;
        }
    }
}
