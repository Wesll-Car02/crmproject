import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import * as controller from './auth.controller';

const router = Router();

router.post('/login', controller.login);
router.post('/refresh', controller.refreshToken);
router.post('/logout', authenticate, controller.logout);
router.get('/me', authenticate, controller.me);
router.post('/forgot-password', controller.forgotPassword);
router.post('/reset-password', controller.resetPassword);
router.post('/invite/accept', controller.acceptInvitation);
router.post('/2fa/setup', authenticate, controller.setup2FA);
router.post('/2fa/verify', authenticate, controller.verify2FA);
router.delete('/2fa', authenticate, controller.disable2FA);

export default router;
