import express, { Response } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import morgan from 'morgan';
import request from 'supertest';
import { PostModel } from '../../model/PostModel';
import { config } from 'dotenv';
import { PostService } from '../../service/PostService';
import { PostRoutes } from '../../routes/PostRoutes';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../../types/AuthenticatedRequest';
import { timingSafeEqual } from 'crypto';
import {verifyToken} from '../../middleware/verifyToken';
const VALID_ROUTE_METHODS = ['get', 'post', 'put', 'delete', 'patch']

config();
jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual('jsonwebtoken'),
  verify: jest.fn().mockImplementation((token: string):  {id: string}=>
    {
      const expectedToken = Buffer.from("90909090");
      const receivedToken = Buffer.from(token);
      if (receivedToken.length === expectedToken.length && 
          timingSafeEqual(receivedToken, expectedToken)) {
          return { id: "user123" };
      }
      else {
        return {id: "other"}
      }
    }),
  sign: jest.fn().mockReturnValue("token")
  }));

  
let mongoServer = new MongoMemoryServer();
const app = express();
app.use(express.json());  
app.use(morgan('tiny')); 

const postService = new PostService();
PostRoutes.forEach((route) => {
  const middlewares = (route ).protected ? [verifyToken] : []; // Add verifyToken only if protected
  const method = route.method.toLowerCase();
  if (!VALID_ROUTE_METHODS.includes(method)) {
      throw new Error(`Unsupported HTTP method: ${method}`);
  }
  app[method as keyof express.Application](
      route.route,
      ...middlewares,
      route.validation,
      async (req: AuthenticatedRequest, res: Response) => {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
              /* If there are validation errors, send a response with the error messages */
              return res.status(400).send({ errors: errors.array() });
          }
          try {
              await route.action(req, res);
          } catch (err) {
              console.error('An error occurred:', err);
              return res.sendStatus(500); // Don't expose internal server workings
          }
      },
    );
});

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri: string = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  await PostModel.deleteMany({});
});

describe('Testing createPost', () => {
  it('should fail to create a post if an error occurs', async () => {
    let spy = jest.spyOn(PostModel.prototype, "save").mockImplementation(() => {
      throw new Error("Database Error 1")
    })
    const newPost = {
      userId: 'user123',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };
  
    const response = await request(app)
      .post('/posts') 
      .send(newPost) 
      .set('Authorization', 'Bearer 90909090')
      .expect(200);
  
    expect(response.body).toBeNull()
    spy.mockClear()
  });
})

describe('Testing getPostById', () => {
  it('should fail to get a post by ID if error occurs', async () => {
    let spy = jest.spyOn(PostModel, "findById").mockImplementation(() => {
      throw new Error("Database Error 2")
    })
    const newPost = {
      userId: 'user123',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const createdPost = await request(app)
      .post('/posts')
      .send(newPost)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);

    const response = await request(app)
      .get(`/posts/${createdPost.body._id}`) 
      .expect(200);

    expect(response.body.postData).toBeNull()
    spy.mockClear()
  });
})

describe('Testing getUserPosts', () => {
  it('should fail to get authenticated posts if error occurs', async () => {
    let spy = jest.spyOn(PostModel, "find").mockImplementation(() => {
      throw new Error("Database Error 3")
    })
    const newPost = {
      userId: 'user123',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };
  
    const newPost2 = {
      userId: 'user123',
      latitude: 40.7180,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };
  
    await request(app)
      .post('/posts')
      .send(newPost)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);
      
    await request(app)
      .post('/posts')
      .send(newPost2)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);

    const response = await request(app)
      .get(`/posts-authenticated`) 
      .set('Authorization', 'Bearer 90909090')
      .query({
        userPostOnly: true,
        start_lat: 40.0,
        end_lat: 41.0,
        start_long: -75.0,
        end_long: -74.0
      })
      .expect(200);
  
    expect(response.body).toBeNull()
    spy.mockClear()
  });

  it('should fail to get all posts if error occurs', async () => {
    let spy = jest.spyOn(PostService.prototype, "getPosts").mockImplementation(() => {
      throw new Error("Database Error 9");
    })
    const newPost = {
      userId: 'user123',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };
      
    const newPost2 = {
      userId: 'user123',
      latitude: 40.7180,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost3 = {
      userId: 'other',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };
      
    await request(app)
      .post('/posts')
      .send(newPost)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);
          
    await request(app)
      .post('/posts')
      .send(newPost2)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);

    await request(app)
      .post('/posts')
      .send(newPost3)
      .set('Authorization', 'Bearer 90909080')
      .expect(200);
      
    const response = await request(app)
      .get(`/posts-authenticated`) 
      .set('Authorization', 'Bearer 90909090')
      .query({
        userPostOnly: false
      })
      .expect(200);
      
    expect(response.body[0]).toHaveProperty('_id');
    expect(response.body[0].latitude).toBe(newPost.latitude);
    expect(response.body[1].latitude).toBe(newPost2.latitude);
    expect(response.body.length).toEqual(2);
    spy.mockClear()
  });
})

describe('Testing getEveryPost', () => {
  it('should fail to get every post if error occurs', async () => {
    let spy = jest.spyOn(PostModel, "find").mockImplementation(() => {
      throw new Error("Database Error 7")
    })
    const newPost = {
      userId: 'user123',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };
  
    const newPost2 = {
      userId: 'user123',
      latitude: 40.7180,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };
  
    await request(app)
      .post('/posts')
      .send(newPost)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);
      
    await request(app)
      .post('/posts')
      .send(newPost2)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);

    const response = await postService.getEveryPost();
  
    expect(response).toBeNull()
    spy.mockClear()
  });
})

describe('Testing getPostAtLocation', () => {
  it('should fail to get post at location if error occurs', async () => {
    let spy = jest.spyOn(PostModel, "find").mockImplementation(() => {
      throw new Error("Database Error 8")
    })
    const newPost = {
      userId: 'user123',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };
  
    const newPost2 = {
      userId: 'user123',
      latitude: 40.7180,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };
  
    await request(app)
      .post('/posts')
      .send(newPost)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);
      
    await request(app)
      .post('/posts')
      .send(newPost2)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);

    const response = await postService.getPostsAtLocation(40.7128, -74.0060, true);
  
    expect(response).toBeNull()
    spy.mockClear()
  });
})

describe('Testing getPublicPosts', () => {
  it('should fail to get public posts in range if error occurs', async () => {
    let spy = jest.spyOn(PostModel, "find").mockImplementation(() => {
      throw new Error("Database Error 4")
    })
    const newPost = {
      userId: 'user123',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };
  
    const newPost2 = {
      userId: 'user123',
      latitude: 40.7180,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };
  
    await request(app)
      .post('/posts')
      .send(newPost)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);
      
    await request(app)
      .post('/posts')
      .send(newPost2)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);
  
    const response = await request(app)
      .get(`/posts`) 
      .query({
        start_lat: 40.0,
        end_lat: 41.0,
        start_long: -75.0,
        end_long: -74.0
      })
      .expect(200);
  
    expect(response.body).toBeNull()
    spy.mockClear()
  });
})

describe('Testing updatePost', () => {
  it('should fail to update a post if error occurs', async () => {
    let spy = jest.spyOn(PostModel, "findByIdAndUpdate").mockImplementation(() => {
      throw new Error("Database Error 5")
    })
    const newPost = {
      userId: 'user123',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const createdPost = await request(app)
      .post('/posts')
      .send(newPost)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);

    const updatedPost = { ...createdPost.body, note: 'Updated note' };

    const response = await request(app)
      .put(`/posts/${createdPost.body._id}`)
      .send(updatedPost)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);

    expect(response.body).toBeNull();
    spy.mockClear()
  });
})

describe('Testing deletePost', () => {
  it('should fail to delete a post if error occurs', async () => {
    let spy = jest.spyOn(PostModel, "findOneAndDelete").mockImplementation(() => {
      throw new Error("Database Error 6")
    })
    const newPost = {
      userId: 'user123',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };
  
    const createdPost = await request(app)
      .post('/posts')
      .send(newPost)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);
  
    const response = await request(app)
      .delete(`/posts/${createdPost.body._id}`)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);
        
    expect(response.body).toBeNull()
    spy.mockClear()
  });
});
