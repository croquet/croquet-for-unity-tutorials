using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class FollowCam : MonoBehaviour
{
    public Transform target;

    public Vector3 followOffset = new Vector3(0.0f, 5.0f, -10f);
    public Vector3 rotationOffset = new Vector3();
    public float translationalLerpSpeed = 1.0f;
    public float rotationalSlerpSpeed = 1.0f;

    void LateUpdate()
    {
        if (target)
        {
            Quaternion targetRot = target.rotation;
            Vector3 desiredPosition = target.position + targetRot * followOffset;
            Vector3 smoothedPosition = Vector3.Lerp(transform.position, desiredPosition, translationalLerpSpeed);
            transform.position = smoothedPosition;

            Quaternion desiredRotation = targetRot * Quaternion.Euler(rotationOffset);
            Quaternion smoothedRotation = Quaternion.Lerp(transform.rotation, desiredRotation, rotationalSlerpSpeed);
            transform.rotation = smoothedRotation;
        }
    }
}
