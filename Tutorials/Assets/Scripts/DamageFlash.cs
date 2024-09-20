using UnityEngine;
using Multisynq;

/*
  DamageFlash.cs
  A demonstration of using:
    [SynqCommand]   and   [SynqRPC]   attributes 
  to call methods sync-hronously on all networked clients.
*/
//========== ||||||||||| ========================
public class DamageFlash : SynqBehaviour {
  private float timer = 0;
  private bool showDamagePanel = false;
  private string damageMessage = "";

  [SynqRPC] // identical to [SynqCommand] (Variant A)
  public void TakeDamage(string bodyPart) {
    showDamagePanel = true;
    timer = Time.time;
    damageMessage = $"Damage: {bodyPart}";
    Debug.Log($"[SynqCommand] DamageFlash.TakeDamage( {bodyPart} ) ");
  }

  [SynqCommand] // identical to [SynqRPC] (Variant B)
  public void Heal() {
    showDamagePanel = true;
    timer = Time.time;
    damageMessage = $"Heal all";
    Debug.Log($"[SynqCommand] DamageFlash.Heal() ");
  }
  // Methods with [SynqCommand] or [SynqRPC] attributes can be called from RPC() or CallSynqCommand()
  // [SynqCommand] or [SynqRPC] are identical in functionality to make porting from legacy networking easier.

  void Update() {

    if (showDamagePanel && Time.time - timer > 0.8f) {
      showDamagePanel = false;      // after   0.8 seconds, hide the damage panel
    }

    // Check for key presses and call TakeDamage() three identical ways: Variant A, B, C
    // These variants make porting from legacy networking easier.
    if (Input.GetKeyDown(KeyCode.T)) {
      RPC("TakeDamage", RpcTarget.All, "Torso"); // calls on all Views (Variant A)
    }
    else if (Input.GetKeyDown(KeyCode.H)) {
      RPC(TakeDamage, RpcTarget.All, "Head");    // calls on all Views (Variant B)
    }
    else if (Input.GetKeyDown(KeyCode.L)) {
      CallSynqCommand(TakeDamage, "Legs");       // calls on all Views (Variant C)
    }
    else if (Input.GetKeyDown(KeyCode.R)) {
      CallSynqCommand(Heal);                     // calls on all Views (Variant C)
    }
  }


  void OnGUI() { // Old school Unity UI! Yuck. But self-contained!
    if (showDamagePanel) {
      // A fullscreen transparent red or green panel with text
      int scale = (int)(Screen.width / 800.0f);
      int left = Screen.width / 2 * scale;
      var isHeal = damageMessage.Contains("Heal");
      GUI.color = (isHeal) ?  new Color(0, 1, 0, 0.8f) : new Color(1, 0, 0, 0.8f); // Semi-transparent green or red
      GUI.DrawTexture(new Rect(left, 0, Screen.width/2, Screen.height), Texture2D.whiteTexture); // Fullscreen panel
      GUIStyle style = new() { alignment = TextAnchor.MiddleCenter, fontSize = 45 * scale };
      style.normal.textColor = (isHeal) ? Color.white : Color.white; // Green or red text
      GUI.color = style.normal.textColor;
      GUI.Label(new Rect(left, 0, Screen.width/2, Screen.height), damageMessage, style); // Text: "Heal" or Damage: ______
    }
  }

}