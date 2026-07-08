// Health + env-wiring probe. First thing to hit after a deploy.
import { withErrorHandling } from './_utils.js';

export default withErrorHandling(async (req, res) => {
  return res.status(200).json({
    ok: true,
    app: 'rally',
    time: new Date().toISOString(),
    env: {
      ANTHROPIC_API_KEY: Boolean(process.env.ANTHROPIC_API_KEY),
      SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
  });
});
