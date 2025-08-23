import { TokenPayload } from '../utils/jwt.utils';
import { User } from '../models/User.model';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      currentUser?: User;
    }
  }
}