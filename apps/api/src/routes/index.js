import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import healthCheck from './health-check.js';
import quizRouter from './quiz.js';
import chatRouter from './chat.js';
import chariowRouter from './chariow.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const chatRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many messages, please slow down' },
    validate: { trustProxy: false },
});

export default () => {
    router.get('/health', healthCheck);
    router.use('/quiz', requireAuth, quizRouter);
    router.use('/chat', requireAuth, chatRateLimit, chatRouter);
    router.use('/chariow', chariowRouter);

    return router;
};
