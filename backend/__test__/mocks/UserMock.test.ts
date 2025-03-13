import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import morgan from 'morgan';
import request from 'supertest';
import { UserController } from '../../controllers/UserController';
import { UserModel } from '../../model/UserModel';
import { UserService } from '../../service/UserService';
import { UserRoutes } from '../../routes/UserRoutes';
import jwt from 'jsonwebtoken';
import verifyToken from '../../middleware/verifyToken';

jest.mock('jsonwebtoken', () => ({
...jest.requireActual('jsonwebtoken'), // import and retain the original functionalities
verify: jest.fn().mockReturnValue({id: "user123"}), // overwrite verify
sign: jest.fn().mockReturnValue("token")
}));
jest.mock("google-auth-library", () => {
  return {
      OAuth2Client: jest.fn().mockImplementation(() => ({
          verifyIdToken: jest.fn().mockResolvedValue({
              getPayload: () => ({
                  sub: "1234",
                  name: "user123",
              })
          })
      }))
  };
});

// Setup MongoDB in-memory server
let mongoServer = new MongoMemoryServer();
// Create the Express app
const app = express();
app.use(express.json());  // Middleware to parse JSON bodies
app.use(morgan('tiny')); // Logger

// Define your routes
const userController = new UserController();
const userService = new UserService();
app.post('/user/auth', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await userController.handleGoogleSignIn(req, res);
    } catch (error) {
        next(error);
    }});  // Route for creating a post
app.get('/user/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
      await userController.getUser(req, res);
  } catch (error) {
      next(error);
  }}); // Route for getting a post by ID



// Setup for in-memory MongoDB testing
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  jest.clearAllMocks();
});

beforeEach(async () => {
  // Clean up any existing posts in the database before each test
  await UserModel.deleteMany({});
});

describe('Mocked User APIs: Expected Behaviour', () => {
  it('should sign in to google with existant user', async () => {
    const newUser = {
      _id: "1234",
      username: "user123",
      firebaseToken: "user12345"
    };

    const user = await userService.createUser(newUser._id, newUser.username, newUser.firebaseToken)
    const response = await request(app)
        .post(`/user/auth`)
        .send({
          googleToken: "google",
          firebaseToken: "firebase"
        })
        .expect(200)

    expect(response.body.token).toBe("token"); // Check userId matches
    expect(response.body.userID).toBe("1234"); // Check userId matches
  });

  it('should sign in to google with a non-existant user', async () => {
    const newUser = {
      _id: "1234",
      username: "user123",
      firebaseToken: "firebase"
    };

    const response = await request(app)
        .post(`/user/auth`)
        .send({
          googleToken: "google",
          firebaseToken: "firebase"
        })
        .expect(200)

    expect(response.body.token).toBe("token"); // Check userId matches
    expect(response.body.userID).toBe("1234"); // Check userId matches

    const response1 = await request(app)
        .get(`/user/${newUser._id}`)
        .expect(200)
    
    expect(response1.body).toHaveProperty('_id'); // Check that the response contains _id
    expect(response1.body._id).toBe(newUser._id); // Check userId matches
    expect(response1.body.username).toBe(newUser.username); // Check userId matches
    expect(response1.body.firebaseToken).toStrictEqual([newUser.firebaseToken]); // Check userId matches
  });
})

describe('Mocked User APIs: Erroneus Behaviour', () => {
  it('should fail to create a user if an error occurs', async () => {
    let spy = jest.spyOn(UserModel.prototype, "save").mockImplementation(() => {
      throw new Error("database issue")
    })
    const newUser = {
      _id: "1234",
      username: "user123",
      firebaseToken: "user12345"
    };
    const user = await userService.createUser(newUser._id, newUser.username, newUser.firebaseToken)
    expect(user).toBeNull();
    spy.mockClear()
  })

  it('should fail to get a user if an error occurs', async () => {
    let spy = jest.spyOn(UserModel, "findById").mockImplementation(() => {
      throw new Error("Database issue");
    })
    const newUser = {
      _id: "1234",
      username: "user123",
      firebaseToken: "user12345"
    };
    const response1 = await request(app)
        .get(`/user/${newUser._id}`)
        .expect(200)
    expect(response1.body).toBeNull();
    spy.mockClear()
  })
})