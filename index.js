const express = require('express');
const path = require('path');
const Arena = require('./src/server/app');
const routes = require('./src/server/views/routes');
const RedisClient = require('redis').RedisClient;

const redis = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  retry_strategy: function (options) {
    if (options.total_retry_time > 1000 * 60 * 60) {
      // End reconnecting after a specific timeout and flush all commands
      // with a individual error
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      // End reconnecting with built in error
      return undefined;
    }
    // reconnect after
    return Math.min(options.attempt * 100, 3000);
  }
};

function run(config, listenOpts = {}) {
  const {app, Queues} = Arena();

  Queues.setConfig({
    queues: [{
      type: 'bee',
      name: process.env.QUEUE_NAME,
      url: redis,
      hostId: 'k8s'
    }]
  });
 
  app.locals.basePath = listenOpts.basePath || app.locals.basePath;

  app.use(app.locals.basePath, express.static(path.join(__dirname, 'public')));
  app.use(app.locals.basePath, routes);

  const port = listenOpts.port || 4567;
  if (!listenOpts.disableListen) {
    app.listen(port, () => console.log(`Arena is running on port ${port}`));
  }

  return app;
}

if (require.main === module) run();

module.exports = run;
