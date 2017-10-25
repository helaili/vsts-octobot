module.exports = (robot) => {
  console.log('Yay, the app was loaded!')
  robot.on('push', async context => {
   robot.log('**************************');
   robot.log(context);
  });

  // Get an express router to expose new HTTP endpoints
  const app = robot.route('/vsts-octobot');

  // Use any middleware
  app.use(require('express').static(__dirname + '/public'));

  // Add a new route
  app.get('/hello-world', (req, res) => {
    res.end('Hello World');
  });

  app.get('/home', (req, res) => {
    res.end('Home');
  });

  app.get('/auth', (req, res) => {
    res.end('Auth');
  });

  app.get('/setup', (req, res) => {
    res.end('Setup');
  });

}
