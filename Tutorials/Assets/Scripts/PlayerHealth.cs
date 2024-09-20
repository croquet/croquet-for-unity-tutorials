using UnityEngine;
using Multisynq;

public class PlayerHealth : SynqBehaviour {

  [SynqVar(CustomName = "hp", OnChangedCallback = nameof(OnHealthChanged) )] 
  public int health = 100;

  [SynqVar] public int legHealth = 100;
  [SynqVar] public int torsoHealth = 100;
  [SynqVar(updateInterval=0.5f)] public int headHealth = 100;

  private void OnHealthChanged(int newValue) {
    Debug.Log($"[SynqVar] Player health changed to {newValue}");
    if      (newValue <= 0) Die();
    else if (newValue < 70) LowHealthWarning();
  }

  void CalcHealth() { health = (legHealth + torsoHealth + headHealth) / 3; }
  void Die() {              Debug.Log($"<color=red>Player died</color> health:{health}"); }
  void LowHealthWarning() { Debug.Log($"<color=yellow>Player health is low</color> health:{health}"); }

  void Update() {
    // Each key "damages" a body part, L, T, H, or heal all parts with R!
    if (Input.GetKeyDown(KeyCode.L)) legHealth   -= 3;
    if (Input.GetKeyDown(KeyCode.T)) torsoHealth -= 3;
    if (Input.GetKeyDown(KeyCode.H)) headHealth  -= 3; 
    if (Input.GetKeyDown(KeyCode.R)) { // Reset (Heal)
      health = 100;
      legHealth = 100;
      torsoHealth = 100;
      headHealth = 100;
    }
    CalcHealth();
  }

  //-- ||||| ----------------------------------------
  void OnGUI() { // Old school Unity UI! Yuck. But self-contained!   =]
    var scaleFactor = Screen.height / 400f; // bottom edge y
    // var y = Screen.height - (100 * scaleFactor);
    var y = 10 * scaleFactor;
    GUI.backgroundColor = new Color(0f, 0f, 0f, 0.5f);
    GUI.Box(new Rect(0, y, 150 * scaleFactor, 100 * scaleFactor), ""); // panel background
    GUI.contentColor = Color.white;

    GUIStyle style = new GUIStyle();
    style.alignment = TextAnchor.MiddleCenter;
    style.fontSize = (int)(20 * scaleFactor);
    style.normal.textColor = new Color(0.5f, 1f, 0.5f, 1f); // lime green
    GUI.Label(new Rect(20 * scaleFactor, y + (10 * scaleFactor), 100 * scaleFactor, 20 * scaleFactor), $" Health: {health.ToString("F1")}",      style);
    GUI.Label(new Rect(20 * scaleFactor, y + (30 * scaleFactor), 100 * scaleFactor, 20 * scaleFactor), $" Leg:    {legHealth.ToString("F1")}",   style);
    GUI.Label(new Rect(20 * scaleFactor, y + (50 * scaleFactor), 100 * scaleFactor, 20 * scaleFactor), $" Torso:  {torsoHealth.ToString("F1")}", style);
    GUI.Label(new Rect(20 * scaleFactor, y + (70 * scaleFactor), 100 * scaleFactor, 20 * scaleFactor), $" Head:   {headHealth.ToString("F1")}",  style);
  }

}

