import messages from "../messages/en.json";

export function PatientHome() {
  return (
    <main className="patient-shell">
      <h1>My Treatment</h1>
      <p>{messages["patient.me.placeholder"]}</p>
    </main>
  );
}
