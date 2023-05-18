using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class ChildToCroquetEntity : MonoBehaviour
{
    public string croquetIdToChildTo;

    private bool successful = false;

    private void Update()
    {
        if (!successful)
        {
            GameObject go = CroquetEntitySystem.Instance.FindObject(croquetIdToChildTo);
            if (go != null)
            {
                transform.parent = go.transform;
                successful = true;
            } 
        }
    }
}
