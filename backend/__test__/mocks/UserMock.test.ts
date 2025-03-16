import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import morgan from 'morgan';
import request from 'supertest';
import { UserModel } from '../../model/UserModel';
import { UserService } from '../../service/UserService';
import { UserRoutes } from '../../routes/UserRoutes';
import verifyToken from '../../middleware/verifyToken';
import { validationResult } from 'express-validator';

jest.mock('jsonwebtoken', () => ({
...jest.requireActual('jsonwebtoken'),
verify: jest.fn().mockReturnValue({id: "user123"}), 
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

let mongoServer = new MongoMemoryServer();

const app = express();
app.use(express.json());  
app.use(morgan('tiny')); 

// const userController = new UserController();
const userService = new UserService();
UserRoutes.forEach((route) => {
  const middlewares = (route as any).protected ? [verifyToken] : [];

  (app as any)[route.method](
      route.route,
      ...middlewares,
      route.validation,
      async (req: Request, res: Response) => {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
              /* If there are validation errors, send a response with the error messages */
              return res.status(400).send({ errors: errors.array() });
          }
          try {
              await route.action(req, res);
          } catch (err) {
              console.error('Error occurred:', err);
              return res.sendStatus(500); // Don't expose internal server workings
          }
      },
  );
});



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
  await UserModel.deleteMany({});
});

describe('Testing handleGoogleSignIn', () => {
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

    expect(response.body.token).toBe("token"); 
    expect(response.body.userID).toBe("1234"); 
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

    expect(response.body.token).toBe("token"); 
    expect(response.body.userID).toBe("1234"); 

    const response1 = await request(app)
        .get(`/user/${newUser._id}`)
        .expect(200)
    
    expect(response1.body).toHaveProperty('_id');
    expect(response1.body._id).toBe(newUser._id); 
    expect(response1.body.username).toBe(newUser.username); 
    expect(response1.body.firebaseToken).toStrictEqual([newUser.firebaseToken]); 
  });

  it('should fail if process.env are not set', async () => {
    const old_processes = process.env;
    process.env = {}
    const response1 = await request(app)
      .post(`/user/auth`)
      .send({
        googleToken: "google",
        firebaseToken: "firebase"
      })
      .expect(400)
    process.env.WEB_CLIENT_ID = "string"
    const response2 = await request(app)
      .post(`/user/auth`)
      .send({
        googleToken: "google",
        firebaseToken: "firebase"
      })
      .expect(400)
    process.env = old_processes;
  })
})

describe('Testing creatsUser', () => {
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
});

describe('Testing getUser', () => {
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