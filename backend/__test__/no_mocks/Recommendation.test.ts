import express, { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import morgan from 'morgan';
import request from 'supertest';
import { PostModel } from '../../model/PostModel';
import { RecommendationController } from '../../controllers/RecommendationController';
import { PostController } from '../../controllers/PostController';
import { AuthenticatedRequest } from '../../types/AuthenticatedRequest';
import { RecommendationRoutes } from '../../routes/RecommendationRoutes';
import { validationResult } from 'express-validator';
import 'dotenv/config';

let mongoServer = new MongoMemoryServer();
const app: express.Application = express();
app.use(express.json());  
app.use(morgan('tiny'));


const recommendationController = new RecommendationController();
const postController = new PostController();
const middleware = (req: AuthenticatedRequest, res: Request, next: NextFunction) => {
  req.user = { id: 'user123' }; 
  next();
}
RecommendationRoutes.forEach((route) => {
  const middlewares = (route as any).protected ? [middleware] : []; // Add verifyToken only if protected

  (app as any)[route.method](
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
              console.error('Error:', err)
              return res.sendStatus(500); // Don't expose internal server workings
          }
      },
  );
});
app.get('/recommendations-no-middlewware', async (req, res, next) : Promise<void> => {
    try {
      await recommendationController.getRecommendation(req as AuthenticatedRequest, res)
    } catch(error) {
      next(error)
    }
  });  
app.post('/posts', (req, res, next) => {
    (req as AuthenticatedRequest).user = { id: 'user123' }; 
    next();
  }, async(req: Request, res: Response, next: NextFunction): Promise<void> => {
    try{
      await postController.createPost(req as AuthenticatedRequest, res);
    } catch(err) {
      next(err);
    }});  

app.post('/posts-from-other', (req, res, next) => {
    (req as AuthenticatedRequest).user = { id: 'other' }; 
    next();
  }, async(req: Request, res: Response, next: NextFunction): Promise<void> => {
    try{
      await postController.createPost(req as AuthenticatedRequest, res);
    } catch(err) {
      next(err);
    }});  

app.post('/posts-from-someone', (req, res, next) => {
    (req as AuthenticatedRequest).user = { id: 'someone' }; 
    next();
  }, async(req: Request, res: Response, next: NextFunction): Promise<void> => {
    try{
      await postController.createPost(req as AuthenticatedRequest, res);
    } catch(err) {
      next(err);
    }}); 

app.post('/posts-from-else', (req, res, next) => {
    (req as AuthenticatedRequest).user = { id: 'else' }; 
    next();
  }, async(req: Request, res: Response, next: NextFunction): Promise<void> => {
    try{
      await postController.createPost(req as AuthenticatedRequest, res);
    } catch(err) {
      next(err);
    }}); 

app.post('/posts-from-fourth', (req, res, next) => {
    (req as AuthenticatedRequest).user = { id: 'fourth' }; 
    next();
  }, async(req: Request, res: Response, next: NextFunction): Promise<void> => {
    try{
      await postController.createPost(req as AuthenticatedRequest, res);
    } catch(err) {
      next(err);
    }}); 


beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await PostModel.deleteMany({});
});

describe('Testing getRecommendations', () => {
  it('should get recommendations, public and private posts', async () => {
    const newPost1 = {
      userId: 'user123',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost2 = {
      userId: 'user123',
      latitude: 45.1280,
      longitude: -78.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };



    const newPost3 = {
      userId: 'user123',
      latitude: 90.321,
      longitude: 118.40,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };



    const newPost4 = {
      userId: 'user123',
      latitude: 32.08,
      longitude: -48.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };


    const newPost5 = {
      userId: 'user123',
      latitude: 46.006,
      longitude: -75.107,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost6 = {
      userId: 'user123',
      latitude: 39.87,
      longitude: -74.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost7 = {
      userId: 'other',
      latitude: 50.11,
      longitude: 29.33,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost8 = {
      userId: 'other',
      latitude: 45.128,
      longitude: -78.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost9 = {
      userId: 'other',
      latitude: 90.321,
      longitude: 118.40,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };



    const newPost10 = {
      userId: 'other',
      latitude: 32.08,
      longitude: -48.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost11 = {
      userId: 'other',
      latitude: 47.31,
      longitude: -71.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };


    const newPost12 = {
      userId: 'other',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };


    const newPost13 = {
      userId: 'someone',
      latitude: 47.31,
      longitude: -71.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost14 = {
      userId: 'someone',
      latitude: 32.08,
      longitude: -48.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost15 = {
      userId: 'someone',
      latitude: 46.006,
      longitude: -75.107,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost16 = {
      userId: 'someone',
      latitude: 39.87,
      longitude: -74.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost17 = {
      userId: 'someone',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost18 = {
      userId: 'someone',
      latitude: 14.11,
      longitude: 31.81,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost19 = {
      userId: 'else',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost20 = {
      userId: 'else',
      latitude: 39.87,
      longitude: -74.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost21 = {
      userId: 'else',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost22 = {
      userId: 'else',
      latitude: 14.11,
      longitude: 31.81,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost23 = {
      userId: 'else',
      latitude: 23.12,
      longitude: 18.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost24 = {
      userId: 'else',
      latitude: 50.11,
      longitude: 29.33,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost25 = {
      userId: 'fourth',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost26 = {
      userId: 'fourth',
      latitude: 47.31,
      longitude: -71.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost27 = {
      userId: 'fourth',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost28 = {
      userId: 'fourth',
      latitude: 14.11,
      longitude: 31.81,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost29 = {
      userId: 'fourth',
      latitude: 23.12,
      longitude: 18.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost30 = {
      userId: 'fourth',
      latitude: 50.11,
      longitude: 29.33,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const user123 = [newPost1, newPost2, newPost3, newPost4, newPost5, newPost6]
    const other = [newPost7, newPost8, newPost9, newPost10, newPost11, newPost12]
    const someone = [newPost13, newPost14, newPost15, newPost16, newPost17, newPost18]
    const else_ = [newPost19, newPost20, newPost21, newPost22, newPost23, newPost24]
    const fourth = [newPost25, newPost26, newPost27, newPost28, newPost29, newPost30]

    // const main_user = "user123"

    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/posts') 
        .send(user123[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-other') 
        .send(other[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-someone') 
        .send(someone[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-else') 
        .send(else_[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-fourth') 
        .send(fourth[Number(i)])
        .expect(200);
    }

    const response = await request(app)
      .get('/recommendations') 
      .query({
        max: 4
      })
      .expect(200);

    expect(response.body.posts[0]).toHaveProperty('_id'); 
    expect(response.body.posts[0].latitude).toBe(41.17);
    expect(response.body.posts[0].longitude).toBe(-70.19); 
    expect(response.body.posts[0].latitude).toEqual(response.body.posts[1].latitude); 
    expect(response.body.posts[0].latitude).toEqual(response.body.posts[2].latitude); 
    expect([response.body.posts[0].userId, response.body.posts[1].userId, response.body.posts[2].userId]).toContain("else") 
    expect([response.body.posts[0].userId, response.body.posts[1].userId, response.body.posts[2].userId]).toContain("someone") 
    expect([response.body.posts[0].userId, response.body.posts[1].userId, response.body.posts[2].userId]).toContain("fourth") 
    expect([14.11, 50.11, 47.31]).toContain(response.body.posts[3].latitude); 
    switch(response.body.posts[3].latitude) {
      case 14.11: {
        expect([response.body.posts[3].userId, response.body.posts[4].userId]).toContain("else"); 
        expect([response.body.posts[3].userId, response.body.posts[4].userId]).toContain("fourth"); 
        break;
      }
      case 50.11: {
        expect([response.body.posts[3].userId, response.body.posts[4].userId]).toContain("other"); 
        expect([response.body.posts[3].userId, response.body.posts[4].userId]).toContain("fourth"); 
        break;
      }
      case 47.31: {
        expect([response.body.posts[3].userId, response.body.posts[4].userId]).toContain("someone"); 
        expect([response.body.posts[3].userId, response.body.posts[4].userId]).toContain("fourth"); 
        break;
      }
      default:
        break;
    }
    expect(response.body.posts[3].latitude).toEqual(response.body.posts[4].latitude); 
    expect([14.11, 50.11, 47.31]).toContain(response.body.posts[5].latitude); 
    switch(response.body.posts[5].latitude) {
      case 14.11: {
        expect([response.body.posts[6].userId, response.body.posts[5].userId]).toContain("else"); 
        expect([response.body.posts[6].userId, response.body.posts[5].userId]).toContain("fourth"); 
        break;
      }
      case 50.11: {
        expect([response.body.posts[6].userId, response.body.posts[5].userId]).toContain("other"); 
        expect([response.body.posts[6].userId, response.body.posts[5].userId]).toContain("fourth"); 
        break;
      }
      case 47.31: {
        expect([response.body.posts[6].userId, response.body.posts[5].userId]).toContain("someone"); 
        expect([response.body.posts[6].userId, response.body.posts[5].userId]).toContain("fourth"); 
        break;
      }
      default:
        break;
    }
    expect(response.body.posts[4].latitude).not.toEqual(response.body.posts[5].latitude); 
    expect(response.body.posts[5].latitude).toEqual(response.body.posts[6].latitude);
    expect([14.11, 50.11, 47.31]).toContain(response.body.posts[7].latitude); 
    switch(response.body.posts[7].latitude) {
      case 14.11: {
        expect([response.body.posts[8].userId, response.body.posts[7].userId]).toContain("else"); 
        expect([response.body.posts[8].userId, response.body.posts[7].userId]).toContain("fourth"); 
        break;
      }
      case 50.11: {
        expect([response.body.posts[8].userId, response.body.posts[7].userId]).toContain("other"); 
        expect([response.body.posts[8].userId, response.body.posts[7].userId]).toContain("fourth"); 
        break;
      }
      case 47.31: {
        expect([response.body.posts[8].userId, response.body.posts[7].userId]).toContain("someone"); 
        expect([response.body.posts[8].userId, response.body.posts[7].userId]).toContain("fourth"); 
        break;
      }
      default:
        break;
    }
    expect(response.body.posts[4].latitude).not.toEqual(response.body.posts[7].latitude); 
    expect(response.body.posts[6].latitude).not.toEqual(response.body.posts[7].latitude); 
    expect(response.body.posts[7].latitude).toEqual(response.body.posts[8].latitude);
    expect(response.body.posts.length).toEqual(9);
  });

  it('should get recommendations, similar user has no public posts', async () => {
    const newPost1 = {
      userId: 'user123',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost2 = {
      userId: 'user123',
      latitude: 45.1280,
      longitude: -78.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost3 = {
      userId: 'user123',
      latitude: 90.321,
      longitude: 118.40,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };



    const newPost4 = {
      userId: 'user123',
      latitude: 32.08,
      longitude: -48.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost5 = {
      userId: 'user123',
      latitude: 46.006,
      longitude: -75.107,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost6 = {
      userId: 'user123',
      latitude: 39.87,
      longitude: -74.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost7 = {
      userId: 'other',
      latitude: 50.11,
      longitude: 29.33,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };


    const newPost8 = {
      userId: 'other',
      latitude: 45.128,
      longitude: -78.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost9 = {
      userId: 'other',
      latitude: 90.321,
      longitude: 118.40,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost10 = {
      userId: 'other',
      latitude: 32.08,
      longitude: -48.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost11 = {
      userId: 'other',
      latitude: 47.31,
      longitude: -71.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost12 = {
      userId: 'other',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost13 = {
      userId: 'someone',
      latitude: 47.31,
      longitude: -71.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost14 = {
      userId: 'someone',
      latitude: 32.08,
      longitude: -48.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost15 = {
      userId: 'someone',
      latitude: 46.006,
      longitude: -75.107,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost16 = {
      userId: 'someone',
      latitude: 39.87,
      longitude: -74.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost17 = {
      userId: 'someone',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost18 = {
      userId: 'someone',
      latitude: 14.11,
      longitude: 31.81,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost19 = {
      userId: 'else',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost20 = {
      userId: 'else',
      latitude: 39.87,
      longitude: -74.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost21 = {
      userId: 'else',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost22 = {
      userId: 'else',
      latitude: 14.11,
      longitude: 31.81,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost23 = {
      userId: 'else',
      latitude: 23.12,
      longitude: 18.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost24 = {
      userId: 'else',
      latitude: 50.11,
      longitude: 29.33,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost25 = {
      userId: 'fourth',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost26 = {
      userId: 'fourth',
      latitude: 47.31,
      longitude: -71.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost27 = {
      userId: 'fourth',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost28 = {
      userId: 'fourth',
      latitude: 14.11,
      longitude: 31.81,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost29 = {
      userId: 'fourth',
      latitude: 23.12,
      longitude: 18.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost30 = {
      userId: 'fourth',
      latitude: 50.11,
      longitude: 29.33,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const user123 = [newPost1, newPost2, newPost3, newPost4, newPost5, newPost6]
    const other = [newPost7, newPost8, newPost9, newPost10, newPost11, newPost12]
    const someone = [newPost13, newPost14, newPost15, newPost16, newPost17, newPost18]
    const else_ = [newPost19, newPost20, newPost21, newPost22, newPost23, newPost24]
    const fourth = [newPost25, newPost26, newPost27, newPost28, newPost29, newPost30]

    // const main_user = "user123"

    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/posts') 
        .send(user123[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-other') 
        .send(other[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-someone') 
        .send(someone[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-else') 
        .send(else_[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-fourth') 
        .send(fourth[Number(i)])
        .expect(200);
    }

    const response = await request(app)
      .get('/recommendations') 
      .query({
        max: 4
      })
      .expect(200);

    expect(response.body.posts[0]).toHaveProperty('_id'); 
    expect(response.body.posts[0].latitude).toBe(41.17);
    expect(response.body.posts[0].longitude).toBe(-70.19); 
    expect(response.body.posts[0].latitude).toEqual(response.body.posts[1].latitude); 
    expect(response.body.posts[0].latitude).toEqual(response.body.posts[2].latitude); 
    expect([14.11, 50.11, 47.31]).toContain(response.body.posts[3].latitude); 
    expect(response.body.posts[3].latitude).toEqual(response.body.posts[4].latitude); 
    expect([14.11, 50.11, 47.31]).toContain(response.body.posts[5].latitude); 
    expect(response.body.posts[4].latitude).not.toEqual(response.body.posts[5].latitude); 
    expect(response.body.posts[5].latitude).toEqual(response.body.posts[6].latitude);
    expect([14.11, 50.11, 47.31]).toContain(response.body.posts[7].latitude); 
    expect(response.body.posts[4].latitude).not.toEqual(response.body.posts[7].latitude); 
    expect(response.body.posts[6].latitude).not.toEqual(response.body.posts[7].latitude); 
    expect(response.body.posts[7].latitude).toEqual(response.body.posts[8].latitude);
    expect(response.body.posts.length).toEqual(9);
  });

  it('should get recommendations, all public posts', async () => {
    const newPost1 = {
      userId: 'user123',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost2 = {
      userId: 'user123',
      latitude: 45.1280,
      longitude: -78.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };



    const newPost3 = {
      userId: 'user123',
      latitude: 90.321,
      longitude: 118.40,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };



    const newPost4 = {
      userId: 'user123',
      latitude: 32.08,
      longitude: -48.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost5 = {
      userId: 'user123',
      latitude: 46.006,
      longitude: -75.107,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost6 = {
      userId: 'user123',
      latitude: 39.87,
      longitude: -74.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost7 = {
      userId: 'other',
      latitude: 50.11,
      longitude: 29.33,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost8 = {
      userId: 'other',
      latitude: 45.128,
      longitude: -78.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost9 = {
      userId: 'other',
      latitude: 90.321,
      longitude: 118.40,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };



    const newPost10 = {
      userId: 'other',
      latitude: 32.08,
      longitude: -48.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost11 = {
      userId: 'other',
      latitude: 47.31,
      longitude: -71.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost12 = {
      userId: 'other',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost13 = {
      userId: 'someone',
      latitude: 47.31,
      longitude: -71.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost14 = {
      userId: 'someone',
      latitude: 32.08,
      longitude: -48.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost15 = {
      userId: 'someone',
      latitude: 46.006,
      longitude: -75.107,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost16 = {
      userId: 'someone',
      latitude: 39.87,
      longitude: -74.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost17 = {
      userId: 'someone',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost18 = {
      userId: 'someone',
      latitude: 14.11,
      longitude: 31.81,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost19 = {
      userId: 'else',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost20 = {
      userId: 'else',
      latitude: 39.87,
      longitude: -74.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost21 = {
      userId: 'else',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost22 = {
      userId: 'else',
      latitude: 14.11,
      longitude: 31.81,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost23 = {
      userId: 'else',
      latitude: 23.12,
      longitude: 18.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost24 = {
      userId: 'else',
      latitude: 50.11,
      longitude: 29.33,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost25 = {
      userId: 'fourth',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost26 = {
      userId: 'fourth',
      latitude: 47.31,
      longitude: -71.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost27 = {
      userId: 'fourth',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost28 = {
      userId: 'fourth',
      latitude: 14.11,
      longitude: 31.81,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost29 = {
      userId: 'fourth',
      latitude: 23.12,
      longitude: 18.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost30 = {
      userId: 'fourth',
      latitude: 50.11,
      longitude: 29.33,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const user123 = [newPost1, newPost2, newPost3, newPost4, newPost5, newPost6]
    const other = [newPost7, newPost8, newPost9, newPost10, newPost11, newPost12]
    const someone = [newPost13, newPost14, newPost15, newPost16, newPost17, newPost18]
    const else_ = [newPost19, newPost20, newPost21, newPost22, newPost23, newPost24]
    const fourth = [newPost25, newPost26, newPost27, newPost28, newPost29, newPost30]

    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/posts') 
        .send(user123[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-other') 
        .send(other[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-someone') 
        .send(someone[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-else') 
        .send(else_[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-fourth') 
        .send(fourth[Number(i)])
        .expect(200);
    }

    const response = await request(app)
      .get('/recommendations') 
      .query({
        max: 4
      })
      .expect(200);

    expect(response.body.posts[0]).toHaveProperty('_id'); 
    expect(response.body.posts[0].latitude).toBe(41.17);
    expect(response.body.posts[0].longitude).toBe(-70.19); 
    expect(response.body.posts[0].latitude).toEqual(response.body.posts[1].latitude); 
    expect(response.body.posts[0].latitude).toEqual(response.body.posts[2].latitude); 
    expect(response.body.posts[0].latitude).toEqual(response.body.posts[3].latitude); 
    expect([14.11, 50.11, 47.31]).toContain(response.body.posts[4].latitude); 
    expect(response.body.posts[4].latitude).toEqual(response.body.posts[5].latitude); 
    expect(response.body.posts[4].latitude).toEqual(response.body.posts[6].latitude);
    expect([14.11, 50.11, 47.31]).toContain(response.body.posts[7].latitude); 
    expect(response.body.posts[6].latitude).not.toEqual(response.body.posts[7].latitude); 
    expect(response.body.posts[7].latitude).toEqual(response.body.posts[8].latitude);
    expect(response.body.posts[7].latitude).toEqual(response.body.posts[9].latitude);
    expect([14.11, 50.11, 47.31]).toContain(response.body.posts[10].latitude); 
    expect(response.body.posts[6].latitude).not.toEqual(response.body.posts[10].latitude); 
    expect(response.body.posts[9].latitude).not.toEqual(response.body.posts[10].latitude); 
    expect(response.body.posts[10].latitude).toEqual(response.body.posts[11].latitude);
    expect(response.body.posts[10].latitude).toEqual(response.body.posts[12].latitude);
    expect(response.body.posts.length).toEqual(13);
  });

  it('should get recommendations, all private posts', async () => {
    const newPost1 = {
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
      latitude: 45.1280,
      longitude: -78.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };



    const newPost3 = {
      userId: 'user123',
      latitude: 90.321,
      longitude: 118.40,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };



    const newPost4 = {
      userId: 'user123',
      latitude: 32.08,
      longitude: -48.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };


    const newPost5 = {
      userId: 'user123',
      latitude: 46.006,
      longitude: -75.107,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };


    const newPost6 = {
      userId: 'user123',
      latitude: 39.87,
      longitude: -74.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };


    const newPost7 = {
      userId: 'other',
      latitude: 50.11,
      longitude: 29.33,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };


    const newPost8 = {
      userId: 'other',
      latitude: 45.128,
      longitude: -78.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };


    const newPost9 = {
      userId: 'other',
      latitude: 90.321,
      longitude: 118.40,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };



    const newPost10 = {
      userId: 'other',
      latitude: 32.08,
      longitude: -48.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };


    const newPost11 = {
      userId: 'other',
      latitude: 47.31,
      longitude: -71.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };


    const newPost12 = {
      userId: 'other',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };


    const newPost13 = {
      userId: 'someone',
      latitude: 47.31,
      longitude: -71.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost14 = {
      userId: 'someone',
      latitude: 32.08,
      longitude: -48.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };


    const newPost15 = {
      userId: 'someone',
      latitude: 46.006,
      longitude: -75.107,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };


    const newPost16 = {
      userId: 'someone',
      latitude: 39.87,
      longitude: -74.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost17 = {
      userId: 'someone',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost18 = {
      userId: 'someone',
      latitude: 14.11,
      longitude: 31.81,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost19 = {
      userId: 'else',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost20 = {
      userId: 'else',
      latitude: 39.87,
      longitude: -74.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost21 = {
      userId: 'else',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost22 = {
      userId: 'else',
      latitude: 14.11,
      longitude: 31.81,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };


    const newPost23 = {
      userId: 'else',
      latitude: 23.12,
      longitude: 18.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost24 = {
      userId: 'else',
      latitude: 50.11,
      longitude: 29.33,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost25 = {
      userId: 'fourth',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost26 = {
      userId: 'fourth',
      latitude: 47.31,
      longitude: -71.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost27 = {
      userId: 'fourth',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost28 = {
      userId: 'fourth',
      latitude: 14.11,
      longitude: 31.81,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };


    const newPost29 = {
      userId: 'fourth',
      latitude: 23.12,
      longitude: 18.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost30 = {
      userId: 'fourth',
      latitude: 50.11,
      longitude: 29.33,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };


    const user123 = [newPost1, newPost2, newPost3, newPost4, newPost5, newPost6]
    const other = [newPost7, newPost8, newPost9, newPost10, newPost11, newPost12]
    const someone = [newPost13, newPost14, newPost15, newPost16, newPost17, newPost18]
    const else_ = [newPost19, newPost20, newPost21, newPost22, newPost23, newPost24]
    const fourth = [newPost25, newPost26, newPost27, newPost28, newPost29, newPost30]

    const main_user = "user123"

    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/posts') 
        .send(user123[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-other') 
        .send(other[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-someone') 
        .send(someone[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-else') 
        .send(else_[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-fourth') 
        .send(fourth[Number(i)])
        .expect(200);
    }

    const response = await request(app)
      .get('/recommendations') 
      .query({
        max: 4
      })
      .expect(200);
      
    expect(response.body.posts.length).toEqual(0);
  });

  it('should get recommendations, no similar users', async () => {
    const newPost1 = {
      userId: 'user123',
      latitude: 40.0,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost2 = {
      userId: 'user123',
      latitude: 45.190,
      longitude: -78.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };



    const newPost3 = {
      userId: 'user123',
      latitude: 90.134,
      longitude: 118.40,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };



    const newPost4 = {
      userId: 'user123',
      latitude: 32.00,
      longitude: -48.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };


    const newPost5 = {
      userId: 'user123',
      latitude: 46.78,
      longitude: -75.107,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost6 = {
      userId: 'user123',
      latitude: 39.15,
      longitude: -74.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost7 = {
      userId: 'other',
      latitude: 50.11,
      longitude: 29.33,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost8 = {
      userId: 'other',
      latitude: 45.128,
      longitude: -78.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost9 = {
      userId: 'other',
      latitude: 90.321,
      longitude: 118.40,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };



    const newPost10 = {
      userId: 'other',
      latitude: 32.08,
      longitude: -48.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost11 = {
      userId: 'other',
      latitude: 47.31,
      longitude: -71.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };


    const newPost12 = {
      userId: 'other',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };


    const newPost13 = {
      userId: 'someone',
      latitude: 47.31,
      longitude: -71.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost14 = {
      userId: 'someone',
      latitude: 32.08,
      longitude: -48.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost15 = {
      userId: 'someone',
      latitude: 46.006,
      longitude: -75.107,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost16 = {
      userId: 'someone',
      latitude: 39.87,
      longitude: -74.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost17 = {
      userId: 'someone',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost18 = {
      userId: 'someone',
      latitude: 14.11,
      longitude: 31.81,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost19 = {
      userId: 'else',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost20 = {
      userId: 'else',
      latitude: 39.87,
      longitude: -74.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost21 = {
      userId: 'else',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost22 = {
      userId: 'else',
      latitude: 14.11,
      longitude: 31.81,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost23 = {
      userId: 'else',
      latitude: 23.12,
      longitude: 18.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost24 = {
      userId: 'else',
      latitude: 50.11,
      longitude: 29.33,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost25 = {
      userId: 'fourth',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost26 = {
      userId: 'fourth',
      latitude: 47.31,
      longitude: -71.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost27 = {
      userId: 'fourth',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost28 = {
      userId: 'fourth',
      latitude: 14.11,
      longitude: 31.81,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost29 = {
      userId: 'fourth',
      latitude: 23.12,
      longitude: 18.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost30 = {
      userId: 'fourth',
      latitude: 50.11,
      longitude: 29.33,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const user123 = [newPost1, newPost2, newPost3, newPost4, newPost5, newPost6]
    const other = [newPost7, newPost8, newPost9, newPost10, newPost11, newPost12]
    const someone = [newPost13, newPost14, newPost15, newPost16, newPost17, newPost18]
    const else_ = [newPost19, newPost20, newPost21, newPost22, newPost23, newPost24]
    const fourth = [newPost25, newPost26, newPost27, newPost28, newPost29, newPost30]

    const main_user = "user123"

    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/posts') 
        .send(user123[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-other') 
        .send(other[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-someone') 
        .send(someone[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-else') 
        .send(else_[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-fourth') 
        .send(fourth[Number(i)])
        .expect(200);
    }

    const response = await request(app)
      .get('/recommendations') 
      .query({
        max: 4
      })
      .expect(200);

    expect(response.body.posts[0]).toHaveProperty('_id'); 
    expect(response.body.posts[0].latitude).toBe(41.17);
    expect(response.body.posts[0].longitude).toBe(-70.19); 
    expect(response.body.posts[0].latitude).toEqual(response.body.posts[1].latitude); 
    expect(response.body.posts[0].latitude).toEqual(response.body.posts[2].latitude); 
    expect([response.body.posts[0].userId, response.body.posts[1].userId, response.body.posts[2].userId]).toContain("else") 
    expect([response.body.posts[0].userId, response.body.posts[1].userId, response.body.posts[2].userId]).toContain("someone") 
    expect([response.body.posts[0].userId, response.body.posts[1].userId, response.body.posts[2].userId]).toContain("fourth") 
    expect([14.11, 50.11, 47.31]).toContain(response.body.posts[3].latitude); 
    switch(response.body.posts[3].latitude) {
      case 14.11: {
        expect([response.body.posts[3].userId, response.body.posts[4].userId]).toContain("else"); 
        expect([response.body.posts[3].userId, response.body.posts[4].userId]).toContain("fourth"); 
        break;
      }
      case 50.11: {
        expect([response.body.posts[3].userId, response.body.posts[4].userId]).toContain("other"); 
        expect([response.body.posts[3].userId, response.body.posts[4].userId]).toContain("fourth"); 
        break;
      }
      case 47.31: {
        expect([response.body.posts[3].userId, response.body.posts[4].userId]).toContain("someone"); 
        expect([response.body.posts[3].userId, response.body.posts[4].userId]).toContain("fourth"); 
        break;
      }
      default:
        break;
    }
    expect(response.body.posts[3].latitude).toEqual(response.body.posts[4].latitude); 
    expect([14.11, 50.11, 47.31]).toContain(response.body.posts[5].latitude); 
    switch(response.body.posts[5].latitude) {
      case 14.11: {
        expect([response.body.posts[6].userId, response.body.posts[5].userId]).toContain("else"); 
        expect([response.body.posts[6].userId, response.body.posts[5].userId]).toContain("fourth"); 
        break;
      }
      case 50.11: {
        expect([response.body.posts[6].userId, response.body.posts[5].userId]).toContain("other"); 
        expect([response.body.posts[6].userId, response.body.posts[5].userId]).toContain("fourth"); 
        break;
      }
      case 47.31: {
        expect([response.body.posts[6].userId, response.body.posts[5].userId]).toContain("someone"); 
        expect([response.body.posts[6].userId, response.body.posts[5].userId]).toContain("fourth"); 
        break;
      }
      default:
        break;
    }
    expect(response.body.posts[4].latitude).not.toEqual(response.body.posts[5].latitude); 
    expect(response.body.posts[5].latitude).toEqual(response.body.posts[6].latitude);
    expect([14.11, 50.11, 47.31]).toContain(response.body.posts[7].latitude); 
    switch(response.body.posts[7].latitude) {
      case 14.11: {
        expect([response.body.posts[8].userId, response.body.posts[7].userId]).toContain("else"); 
        expect([response.body.posts[8].userId, response.body.posts[7].userId]).toContain("fourth"); 
        break;
      }
      case 50.11: {
        expect([response.body.posts[8].userId, response.body.posts[7].userId]).toContain("other"); 
        expect([response.body.posts[8].userId, response.body.posts[7].userId]).toContain("fourth"); 
        break;
      }
      case 47.31: {
        expect([response.body.posts[8].userId, response.body.posts[7].userId]).toContain("someone"); 
        expect([response.body.posts[8].userId, response.body.posts[7].userId]).toContain("fourth"); 
        break;
      }
      default:
        break;
    }
    expect(response.body.posts[4].latitude).not.toEqual(response.body.posts[7].latitude); 
    expect(response.body.posts[6].latitude).not.toEqual(response.body.posts[7].latitude); 
    expect(response.body.posts[7].latitude).toEqual(response.body.posts[8].latitude);
    expect(response.body.posts.length).toEqual(9);
  });

  it('should get recommendations, no user posts', async () => {
    const newPost7 = {
      userId: 'other',
      latitude: 50.11,
      longitude: 29.33,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost8 = {
      userId: 'other',
      latitude: 45.128,
      longitude: -78.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost9 = {
      userId: 'other',
      latitude: 90.321,
      longitude: 118.40,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };



    const newPost10 = {
      userId: 'other',
      latitude: 32.08,
      longitude: -48.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost11 = {
      userId: 'other',
      latitude: 47.31,
      longitude: -71.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };


    const newPost12 = {
      userId: 'other',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };


    const newPost13 = {
      userId: 'someone',
      latitude: 47.31,
      longitude: -71.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost14 = {
      userId: 'someone',
      latitude: 32.08,
      longitude: -48.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost15 = {
      userId: 'someone',
      latitude: 46.006,
      longitude: -75.107,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost16 = {
      userId: 'someone',
      latitude: 39.87,
      longitude: -74.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost17 = {
      userId: 'someone',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost18 = {
      userId: 'someone',
      latitude: 14.11,
      longitude: 31.81,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost19 = {
      userId: 'else',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost20 = {
      userId: 'else',
      latitude: 39.87,
      longitude: -74.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost21 = {
      userId: 'else',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost22 = {
      userId: 'else',
      latitude: 14.11,
      longitude: 31.81,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost23 = {
      userId: 'else',
      latitude: 23.12,
      longitude: 18.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost24 = {
      userId: 'else',
      latitude: 50.11,
      longitude: 29.33,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost25 = {
      userId: 'fourth',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost26 = {
      userId: 'fourth',
      latitude: 47.31,
      longitude: -71.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost27 = {
      userId: 'fourth',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost28 = {
      userId: 'fourth',
      latitude: 14.11,
      longitude: 31.81,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost29 = {
      userId: 'fourth',
      latitude: 23.12,
      longitude: 18.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost30 = {
      userId: 'fourth',
      latitude: 50.11,
      longitude: 29.33,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const other = [newPost7, newPost8, newPost9, newPost10, newPost11, newPost12]
    const someone = [newPost13, newPost14, newPost15, newPost16, newPost17, newPost18]
    const else_ = [newPost19, newPost20, newPost21, newPost22, newPost23, newPost24]
    const fourth = [newPost25, newPost26, newPost27, newPost28, newPost29, newPost30]

    const main_user = "user123"

    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/posts-from-other') 
        .send(other[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-someone') 
        .send(someone[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-else') 
        .send(else_[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-fourth') 
        .send(fourth[Number(i)])
        .expect(200);
    }

    const response = await request(app)
      .get('/recommendations') 
      .query({
        max: 4
      })
      .expect(200);

    expect(response.body.posts[0]).toHaveProperty('_id'); 
    expect(response.body.posts[0].latitude).toBe(41.17);
    expect(response.body.posts[0].longitude).toBe(-70.19); 
    expect(response.body.posts[0].latitude).toEqual(response.body.posts[1].latitude); 
    expect(response.body.posts[0].latitude).toEqual(response.body.posts[2].latitude); 
    expect([response.body.posts[0].userId, response.body.posts[1].userId, response.body.posts[2].userId]).toContain("else") 
    expect([response.body.posts[0].userId, response.body.posts[1].userId, response.body.posts[2].userId]).toContain("someone") 
    expect([response.body.posts[0].userId, response.body.posts[1].userId, response.body.posts[2].userId]).toContain("fourth") 
    expect([14.11, 50.11, 47.31]).toContain(response.body.posts[3].latitude); 
    switch(response.body.posts[3].latitude) {
      case 14.11: {
        expect([response.body.posts[3].userId, response.body.posts[4].userId]).toContain("else"); 
        expect([response.body.posts[3].userId, response.body.posts[4].userId]).toContain("fourth"); 
        break;
      }
      case 50.11: {
        expect([response.body.posts[3].userId, response.body.posts[4].userId]).toContain("other"); 
        expect([response.body.posts[3].userId, response.body.posts[4].userId]).toContain("fourth"); 
        break;
      }
      case 47.31: {
        expect([response.body.posts[3].userId, response.body.posts[4].userId]).toContain("someone"); 
        expect([response.body.posts[3].userId, response.body.posts[4].userId]).toContain("fourth"); 
        break;
      }
      default:
        break;
    }
    expect(response.body.posts[3].latitude).toEqual(response.body.posts[4].latitude); 
    expect([14.11, 50.11, 47.31]).toContain(response.body.posts[5].latitude); 
    switch(response.body.posts[5].latitude) {
      case 14.11: {
        expect([response.body.posts[6].userId, response.body.posts[5].userId]).toContain("else"); 
        expect([response.body.posts[6].userId, response.body.posts[5].userId]).toContain("fourth"); 
        break;
      }
      case 50.11: {
        expect([response.body.posts[6].userId, response.body.posts[5].userId]).toContain("other"); 
        expect([response.body.posts[6].userId, response.body.posts[5].userId]).toContain("fourth"); 
        break;
      }
      case 47.31: {
        expect([response.body.posts[6].userId, response.body.posts[5].userId]).toContain("someone"); 
        expect([response.body.posts[6].userId, response.body.posts[5].userId]).toContain("fourth"); 
        break;
      }
      default:
        break;
    }
    expect(response.body.posts[4].latitude).not.toEqual(response.body.posts[5].latitude); 
    expect(response.body.posts[5].latitude).toEqual(response.body.posts[6].latitude);
    expect([14.11, 50.11, 47.31]).toContain(response.body.posts[7].latitude); 
    switch(response.body.posts[7].latitude) {
      case 14.11: {
        expect([response.body.posts[8].userId, response.body.posts[7].userId]).toContain("else"); 
        expect([response.body.posts[8].userId, response.body.posts[7].userId]).toContain("fourth"); 
        break;
      }
      case 50.11: {
        expect([response.body.posts[8].userId, response.body.posts[7].userId]).toContain("other"); 
        expect([response.body.posts[8].userId, response.body.posts[7].userId]).toContain("fourth"); 
        break;
      }
      case 47.31: {
        expect([response.body.posts[8].userId, response.body.posts[7].userId]).toContain("someone"); 
        expect([response.body.posts[8].userId, response.body.posts[7].userId]).toContain("fourth"); 
        break;
      }
      default:
        break;
    }
    expect(response.body.posts[4].latitude).not.toEqual(response.body.posts[7].latitude); 
    expect(response.body.posts[6].latitude).not.toEqual(response.body.posts[7].latitude); 
    expect(response.body.posts[7].latitude).toEqual(response.body.posts[8].latitude);
    expect(response.body.posts.length).toEqual(9);
  });

  it('should get recommendations, no query inputted', async () => {
    const newPost7 = {
      userId: 'other',
      latitude: 50.11,
      longitude: 29.33,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost8 = {
      userId: 'other',
      latitude: 45.128,
      longitude: -78.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost9 = {
      userId: 'other',
      latitude: 90.321,
      longitude: 118.40,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };



    const newPost10 = {
      userId: 'other',
      latitude: 32.08,
      longitude: -48.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost11 = {
      userId: 'other',
      latitude: 47.31,
      longitude: -71.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };


    const newPost12 = {
      userId: 'other',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };


    const newPost13 = {
      userId: 'someone',
      latitude: 47.31,
      longitude: -71.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost14 = {
      userId: 'someone',
      latitude: 32.08,
      longitude: -48.90,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost15 = {
      userId: 'someone',
      latitude: 46.006,
      longitude: -75.107,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost16 = {
      userId: 'someone',
      latitude: 39.87,
      longitude: -74.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost17 = {
      userId: 'someone',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost18 = {
      userId: 'someone',
      latitude: 14.11,
      longitude: 31.81,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost19 = {
      userId: 'else',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost20 = {
      userId: 'else',
      latitude: 39.87,
      longitude: -74.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost21 = {
      userId: 'else',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost22 = {
      userId: 'else',
      latitude: 14.11,
      longitude: 31.81,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost23 = {
      userId: 'else',
      latitude: 23.12,
      longitude: 18.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost24 = {
      userId: 'else',
      latitude: 50.11,
      longitude: 29.33,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const newPost25 = {
      userId: 'fourth',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost26 = {
      userId: 'fourth',
      latitude: 47.31,
      longitude: -71.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost27 = {
      userId: 'fourth',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost28 = {
      userId: 'fourth',
      latitude: 14.11,
      longitude: 31.81,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const newPost29 = {
      userId: 'fourth',
      latitude: 23.12,
      longitude: 18.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost30 = {
      userId: 'fourth',
      latitude: 50.11,
      longitude: 29.33,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };


    const other = [newPost7, newPost8, newPost9, newPost10, newPost11, newPost12]
    const someone = [newPost13, newPost14, newPost15, newPost16, newPost17, newPost18]
    const else_ = [newPost19, newPost20, newPost21, newPost22, newPost23, newPost24]
    const fourth = [newPost25, newPost26, newPost27, newPost28, newPost29, newPost30]

    // const main_user = "user123"

    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/posts-from-other') 
        .send(other[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-someone') 
        .send(someone[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-else') 
        .send(else_[Number(i)]) 
        .expect(200);
      await request(app)
        .post('/posts-from-fourth') 
        .send(fourth[Number(i)])
        .expect(200);
    }

    const response = await request(app)
      .get('/recommendations') 
      .expect(200);

    expect(response.body.posts[0]).toHaveProperty('_id'); 
    expect(response.body.posts[0].latitude).toBe(41.17);
    expect(response.body.posts[0].longitude).toBe(-70.19); 
    expect(response.body.posts[0].latitude).toEqual(response.body.posts[1].latitude); 
    expect(response.body.posts[0].latitude).toEqual(response.body.posts[2].latitude); 
    expect([response.body.posts[0].userId, response.body.posts[1].userId, response.body.posts[2].userId]).toContain("else") 
    expect([response.body.posts[0].userId, response.body.posts[1].userId, response.body.posts[2].userId]).toContain("someone") 
    expect([response.body.posts[0].userId, response.body.posts[1].userId, response.body.posts[2].userId]).toContain("fourth") 
    expect([14.11, 50.11, 47.31]).toContain(response.body.posts[3].latitude); 
    switch(response.body.posts[3].latitude) {
      case 14.11: {
        expect([response.body.posts[3].userId, response.body.posts[4].userId]).toContain("else"); 
        expect([response.body.posts[3].userId, response.body.posts[4].userId]).toContain("fourth"); 
        break;
      }
      case 50.11: {
        expect([response.body.posts[3].userId, response.body.posts[4].userId]).toContain("other"); 
        expect([response.body.posts[3].userId, response.body.posts[4].userId]).toContain("fourth"); 
        break;
      }
      case 47.31: {
        expect([response.body.posts[3].userId, response.body.posts[4].userId]).toContain("someone"); 
        expect([response.body.posts[3].userId, response.body.posts[4].userId]).toContain("fourth"); 
        break;
      }
      default:
        break;
    }
    expect(response.body.posts[3].latitude).toEqual(response.body.posts[4].latitude); 
    expect([14.11, 50.11, 47.31]).toContain(response.body.posts[5].latitude); 
    switch(response.body.posts[5].latitude) {
      case 14.11: {
        expect([response.body.posts[6].userId, response.body.posts[5].userId]).toContain("else"); 
        expect([response.body.posts[6].userId, response.body.posts[5].userId]).toContain("fourth"); 
        break;
      }
      case 50.11: {
        expect([response.body.posts[6].userId, response.body.posts[5].userId]).toContain("other"); 
        expect([response.body.posts[6].userId, response.body.posts[5].userId]).toContain("fourth"); 
        break;
      }
      case 47.31: {
        expect([response.body.posts[6].userId, response.body.posts[5].userId]).toContain("someone"); 
        expect([response.body.posts[6].userId, response.body.posts[5].userId]).toContain("fourth"); 
        break;
      }
      default:
        break;
    }
    expect(response.body.posts[4].latitude).not.toEqual(response.body.posts[5].latitude); 
    expect(response.body.posts[5].latitude).toEqual(response.body.posts[6].latitude);
    expect([14.11, 50.11, 47.31]).toContain(response.body.posts[7].latitude); 
    switch(response.body.posts[7].latitude) {
      case 14.11: {
        expect([response.body.posts[8].userId, response.body.posts[7].userId]).toContain("else"); 
        expect([response.body.posts[8].userId, response.body.posts[7].userId]).toContain("fourth"); 
        break;
      }
      case 50.11: {
        expect([response.body.posts[8].userId, response.body.posts[7].userId]).toContain("other"); 
        expect([response.body.posts[8].userId, response.body.posts[7].userId]).toContain("fourth"); 
        break;
      }
      case 47.31: {
        expect([response.body.posts[8].userId, response.body.posts[7].userId]).toContain("someone"); 
        expect([response.body.posts[8].userId, response.body.posts[7].userId]).toContain("fourth"); 
        break;
      }
      default:
        break;
    }
    expect(response.body.posts[4].latitude).not.toEqual(response.body.posts[7].latitude); 
    expect(response.body.posts[6].latitude).not.toEqual(response.body.posts[7].latitude); 
    expect(response.body.posts[7].latitude).toEqual(response.body.posts[8].latitude);
  });

  it('should return empty list if no posts', async () => {
    const response = await request(app)
      .get("/recommendations")
      .expect(200)

    expect(response.body.posts).toEqual([])
  });

  it('should return an error if the user is not provided', async () => {
    const newPost1 = {
      userId: 'someone',
      latitude: 39.87,
      longitude: -74.12,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost2 = {
      userId: 'someone',
      latitude: 41.17,
      longitude: -70.19,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    await request(app)
        .post('/posts-from-someone') 
        .send(newPost1) 
        .expect(200);
    await request(app)
        .post('/posts-from-someone') 
        .send(newPost2) 
        .expect(200);
    const response = await request(app)
      .get("/recommendations-no-middlewware")
      .expect(401)
  });
});