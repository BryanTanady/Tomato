import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import morgan from 'morgan';
import request from 'supertest';
import { UserController } from '../../controllers/UserController';
import { UserModel } from '../../model/UserModel';

jest.mock('jsonwebtoken', () => {
  // Fix requireActual type assertion
  const actualJWT = jest.requireActual<typeof import('jsonwebtoken')>('jsonwebtoken');
  
  return {
    ...actualJWT,
    verify: jest.fn()
      .mockImplementation((
        token: string,
        secret: string,
        callback?: (err: unknown, decoded?: unknown) => void
      ) => {
        if (callback) {
          callback(null, { id: "user123" });
          return;
        }
        return { id: "user123" };
      }) as jest.MockedFunction<typeof actualJWT.verify>,
    
    // Fix unused payload parameter
    sign: jest.fn()
      .mockImplementation((payload: string | object, secret: string) => {
        // Use payload in dummy implementation
        if (payload) return "mocked-token";
        return "mocked-token";
      }) as jest.MockedFunction<typeof actualJWT.sign>
  };
});


jest.mock("google-auth-library", (): { OAuth2Client: jest.Mock } => {
  return {
    OAuth2Client: jest.fn().mockImplementation((): {
      verifyIdToken: jest.Mock<Promise<{
        getPayload: () => { email: string }
      }>, [unknown]>
    } => ({
      verifyIdToken: jest.fn().mockImplementation((): Promise<{
        getPayload: () => { email: string }
      }> => Promise.resolve({
        getPayload: (): { email: string } => ({ email: "email" })
      }))
    }))
  };
});

let mongoServer = new MongoMemoryServer();

const app = express();
app.use(express.json());  
app.use(morgan('tiny')); 

const userController = new UserController();
app.post('/user-faulty/auth', (req: Request, res: Response, next: NextFunction): void => {
    try {
        userController.handleGoogleSignIn(req, res)
        .then(() => { next(); })
        .catch((err: unknown) => { next(err); });
    } catch (error) {
        next(error);
    }});  

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri as string);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await UserModel.deleteMany({});
});

describe('Testing handleGoogleSignIn', () => {
  it('should fail to sign in to google with faulty payload', async () => {
    await request(app)
        .post(`/user-faulty/auth`)
        .send({
          googleToken: "google",
          firebaseToken: "firebase"
        })
        .expect(400)
  });
})