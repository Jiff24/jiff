import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';
import { MOVIES } from '@consumet/extensions';
import { StreamingServers } from '@consumet/extensions/dist/models';

import cache from '../../utils/cache';
import { redis } from '../../main';
import { Redis } from 'ioredis';


const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  const kissasian = new MOVIES.KissAsian(

  );

  fastify.get('/', (_, rp) => {
    rp.status(200).send({
      intro:
        "Welcome to the kissasian provider: check out the provider's website @ https://kissasian.dad/watch/",
      routes: ['/:query', '/info', '/watch', '/recent', "/top-updates", "/trending"],
      documentation: 'https://docs.consumet.org/#tag/kissasian',
    });
  });

  fastify.get('/:query', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = decodeURIComponent((request.params as { query: string }).query);

    const page = (request.query as { page: number }).page;

    let res = redis
      ? await cache.fetch(
          redis as Redis,
          `kissasian:${query}:${page}`,
          async () => await kissasian.search(query, page ? page : 1),
          60 * 60 * 6,
        )
      : await kissasian.search(query, page ? page : 1);

    reply.status(200).send(res);
  });

  fastify.get('/info', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.query as { id: string }).id;

    if (typeof id === 'undefined')
      return reply.status(400).send({
        message: 'id is required',
      });

    try {
      let res = redis
        ? await cache.fetch(
            redis as Redis,
            `kissasian:info:${id}`,
            async () => await kissasian.fetchMediaInfo(id),
            60 * 60 * 3,
          )
        : await kissasian.fetchMediaInfo(id);

      reply.status(200).send(res);
    } catch (err) {
      reply.status(500).send({
        message:
          'Something went wrong. Please try again later. or contact the developers.',
      });
    }
  });

  fastify.get('/watch/:episodeId', async (request: FastifyRequest, reply: FastifyReply) => {
    const episodeId = (request.query as { episodeId: string }).episodeId;
    console.log();
    
    if (typeof episodeId === 'undefined')
      return reply.status(400).send({ message: 'episodeId is required' });


    try {
      let res = redis
        ? await cache.fetch(
            redis as Redis,
            `kissasian:watch:${episodeId}`,
            async () => await kissasian.fetchEpisodeSources(episodeId),
            60 * 30,
          )
        : await kissasian.fetchEpisodeSources(episodeId);

      reply.status(200).send(res);
    } catch (err) {
      reply
        .status(500)
        .send({ message: 'Something went wrong. Please try again later.' });
    }
  });
};

export default routes;
