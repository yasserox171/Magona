import { UserRole } from "@magona/shared";

export interface RequestUser {
  id: string;
  email: string;
  role: UserRole;
}
