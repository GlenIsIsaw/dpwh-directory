import { UNIQUE_POSITIONS } from "./options";

export const LEADER_POSITIONS = [
  "District Engineer",
  "Assistant District Engineer",
  ...UNIQUE_POSITIONS.filter((p) => p.startsWith("OIC")),
];

// the Active holder shown on each leadership card (first match per position)
export function pickLeaders(employees) {
  const map = new Map();
  LEADER_POSITIONS.forEach((position) => {
    const person = employees.find(
      (e) => e.position === position && e.status === "Active"
    );
    if (person) map.set(position, person);
  });
  return map;
}