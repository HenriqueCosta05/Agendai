import { Policy } from '@nestjs/authorization';
import type { User } from '../users/user.js';

@Policy()
export class AccessPolicy {
  read(user: User | null) {
    return user !== null;
  }

  manage(user: User | null) {
    return user?.role === 'admin';
  }
}
