import { Link } from "react-router-dom";

import messages from "../messages/en.json";

export function PublicHome() {
  return (
    <main className="patient-shell">
      <h1>Lewis Patient Portal</h1>
      <p>{messages["patient.public.placeholder"]}</p>
      <Link to="/me">Go to my treatment</Link>
    </main>
  );
}
