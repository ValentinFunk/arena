const express = require('express');
const path = require('path');
const Arena = require('./src/server/app');
const routes = require('./src/server/views/routes');
const RedisClient = require('redis').RedisClient;
const request = require('request-promise-native');

const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = process.env.REDIS_PORT;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const PATH_PREFIX = process.env.PATH_PREFIX;

const redis = {
  host: REDIS_HOST,
  port: parseInt(REDIS_PORT),
  password: REDIS_PASSWORD,
  retry_strategy: function (options) {
    if (options.total_retry_time > 1000 * 60 * 60) {
      // End reconnecting after a specific timeout and flush all commands
      // with a individual error
      return new Error('Retry time exhausted');
    }
    // reconnect after
    return Math.min(options.attempt * 100, 3000);
  }
};

function run(config, listenOpts = {}) {
  const {app, Queues} = Arena();

  setInterval(() => {
    request(`${API_URL}/deployer/queues`, {qs: {
      apiKey: API_KEY
    }}).then(queues => {
      const queues = queues.map(name => ({
        type: 'bee',
        name,
        url: redis,
        hostId: 'k8s'
      }));

      Queues.setConfig({
        queues
      });
    });
  }, 1000);
 
  app.locals.basePath = listenOpts.basePath || app.locals.basePath;

  app.use(app.locals.basePath, express.static(path.join(__dirname, 'public')));
  app.use(app.locals.basePath, routes);

  const port = listenOpts.port || 4567;
  if (!listenOpts.disableListen) {
    app.listen(port, () => console.log(`Arena is running on port ${port}`));
  }

  return app;
}

if (require.main === module) run({basePath: PATH_PREFIX});

module.exports = run;
