export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        sub: string;
        email?: string;
        name?: string;
        picture?: string | null;
        admin?: boolean;
      };
    }
  }
}
