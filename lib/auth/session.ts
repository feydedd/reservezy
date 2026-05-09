import { getServerSession } from "next-auth";

import { authOptions } from "./options";

export function getReservezySession() {
  return getServerSession(authOptions);
}
