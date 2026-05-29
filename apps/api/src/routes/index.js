import { Router } from 'express';
import healthCheck from './health-check.js';
import quizRouter from './quiz.js';

const router = Router();

export default () => {
    router.get('/health', healthCheck);
    router.use('/quiz', quizRouter);

    return router;
};
