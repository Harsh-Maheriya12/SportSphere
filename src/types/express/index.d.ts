import { IUser } from '../../models/User';

// This is a TypeScript Declaration Merging file.
// It extends the global namespace for the Express Core package to add a custom 'user' property.
// This provides type safety and autocompletion for `req.user` in all protected routes.
declare global {
  namespace Express {
    export interface Request {
      user?: IUser; // The user property will be an IUser object, but it's optional.
    }
  }
}