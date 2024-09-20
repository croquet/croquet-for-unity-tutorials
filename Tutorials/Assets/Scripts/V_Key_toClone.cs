using UnityEngine;
using Multisynq;

class V_Key_toClone: SynqBehaviour {

  void CloneMe() {
    SynqClones_Mgr.SynqClone(gameObject);
    // disable self so we done clone again with keypress
    enabled = false;
  }

  public void Update() {
    if (Input.GetKeyDown(KeyCode.V)) {
      CloneMe();
    }
  }
}