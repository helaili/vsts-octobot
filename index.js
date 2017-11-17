const path = require('path')
const bodyParser = require('body-parser')
const viewTemplate = require('./lib/view-template')
const PersistenceLayer = require('./lib/persistence-layer')
const BuildManager = require('./lib/build-manager')

module.exports = (robot) => {
  if (!process.env.FERNET_SECRET && process.env.NODE_ENV === 'production') {
    console.error('Missing Fernet secret. Set FERNET_SECRET in your .env file or as an environment variable.')
    process.exit()
  }

  let persistence = new PersistenceLayer(process.env.FERNET_SECRET)
  let buildMngr = new BuildManager(robot)

  let setupView = viewTemplate.getView('./views/setup.html')
  let errorView = viewTemplate.getView('./views/error.html')
  let successView = viewTemplate.getView('./views/success.html')

  // Receiving a push event on github
  robot.on('push', async context => {
    robot.log.trace('Received push event')
    buildMngr.build(context)
  })

  robot.on('installation', async context => {
    // TODO: manage removal of the application
    robot.log.trace('Received installation event')
  })

  // Get an express router to expose new HTTP endpoints
  const app = robot.route('/vsts-octobot')

  app.use(require('express').static(path.join(__dirname, '/public')))
  // parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({ extended: false }))
  // parse application/json
  app.use(bodyParser.json())

  app.post('/buildResult', (req, res) => {
    buildMngr.buildCompleted(req.body).then((response) => {
      return res.json(response)
    }, (error) => {
      return res.sendStatus(401).json(error)
    })
  })

  app.get('/auth', (req, res) => {
    res.end('Auth')
  })

  const showSetupPage = (res, installationId) => {
    let view = setupView.replace('{{installation_id}}', installationId)
    res.end(view)
  }

  // Display the form to enter the VSTS Token
  app.get('/setup', (req, res) => {
    showSetupPage(res, req.query.installation_id)
  })

  // Receive the VSTS token within the posted form
  app.post('/setup', (req, res) => {
    if (req.body.installation_id && req.body.token) {
      persistence.setToken(req.body.installation_id, req.body.token)
    } else if (!req.body.token) {
      // Missing token, go back to the setup page
      return showSetupPage(res, req.body.installation_id)
    } else {
      // if (!req.body.installation_id)
      // Something weird happened. Redirect to error page
      return res.end(errorView)
    }

    // TODO: Register a webhook in VSTS so we're notified of the build result
    res.end(successView)
  })
  return app
}
