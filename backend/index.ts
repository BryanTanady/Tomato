import express, {NextFunction, Request, Response} from 'express';
import { validationResult } from 'express-validator';
import { PostRoutes } from './routes/PostRoutes';
import connectDB  from "./db";
import morgan from 'morgan'
import verifyToken from './middleware/verifyToken'
import { UserRoutes } from './routes/UserRoutes';
import { ChatRoutes } from './routes/ChatRoutes';
import { config } from 'dotenv';
import startWSS from './wss';
import { RecommendationRoutes } from './routes/RecommendationRoutes';
config();

const app = express();

app.use(express.json({limit: '100mb'}));
app.use(morgan('tiny'))
// app.use(UploadFile) // TODO: Add this for one route only
// TODO: Cleanup as any

export interface AuthenticatedRequest extends Request {
    user: { id: string }; 
    params: { 
        id: string 
        message_id: string
    }; 
}

app.get('/', (req: Request, res: Response) => {
    res.send('Hello World');
});

const allRoutes = [...PostRoutes, ...UserRoutes, ...ChatRoutes, ...RecommendationRoutes]
allRoutes.forEach((route) => {
    const middlewares = (route as any).protected ? [verifyToken] : []; // Add verifyToken only if protected

    (app as any)[route.method](
        route.route,
        ...middlewares,
        route.validation,
        async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                /* If there are validation errors, send a response with the error messages */
                return res.status(400).send({ errors: errors.array() });
            }
            try {
                await route.action(req, res, next);
            } catch (err) {
                console.log(err)
                return res.sendStatus(500); // Don't expose internal server workings
            }
        },
    );
});

const PORT = Number(process.env.PORT) || 3000

connectDB().then(() => {
    app.listen(PORT, '0.0.0.0' as any, () => {
        startWSS()
        console.log(`Server is running on port ${PORT}`);
      });

}).catch((err) => {
    console.error(err);
})
