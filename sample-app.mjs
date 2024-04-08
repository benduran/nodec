import Fastify from 'fastify';
import { generate } from 'random-words';

const fastify = Fastify({
  logger: true,
});

// Declare a route
fastify.get('/', (request, reply) => {
  reply.send({ hello: 'world' });
});
fastify.get('/random', async (req, rep) => {
  rep.send(generate(50));
});

// Run the server!
fastify.listen({ host: '::1', port: 3000 }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.info(`server is now listening on ${address}`);
});
