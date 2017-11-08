const path = require('path')
const vsts = require('vso-node-api')
const bodyParser = require('body-parser')
const GitHubStatus = require('./lib/github-status')
const viewTemplate = require('./lib/view-template')
const PersistenceLayer = require('./lib/persistence-layer')

module.exports = (robot) => {
  if (!process.env.FERNET_SECRET) {
    console.error('Missing Fernet secret. Set FERNET_SECRET in your .env file or as an environment variable.')
    process.exit()
  }
  let persistence = new PersistenceLayer(process.env.FERNET_SECRET)

  const notifyError = async function (context, buidlDefinintionUrl, logMessage) {
    let failingStatus = new GitHubStatus(context.payload.head_commit.id, 'failure', buidlDefinintionUrl, logMessage, 'continuous-integration/vsts')

    failingStatus.send(context, (failingStatusResult) => {
      if (!failingStatusResult.data.id) {
        // Something terribly wrong happened
        robot.log.error('Failing to send GitHub commit status', failingStatusResult)
      }
    })
  }

  // Receiving a push event on github
  robot.on('push', async context => {
    try {
      const config = await context.config('vsts-octobot.yml')
      let instance = config.instance
      let collection = config.collection
      let project = config.project
      let buildDefinition = config.buildDefinition

      let collectionUrl = `https://${instance}/${collection}`
      let buidlDefinintionUrl = `https://${instance}/${collection}/${project}/_build/index?definitionId=${buildDefinition}`

      let vstsToken = persistence.get(context.payload.installation.id)

      // Connecting to VSTS Build API
      let authHandler = vsts.getPersonalAccessTokenHandler(vstsToken)
      let connect = new vsts.WebApi(collectionUrl, authHandler)
      let vstsBuild = connect.getBuildApi()

      let contactingVSTSStatus = new GitHubStatus(context.payload.head_commit.id, 'pending', buidlDefinintionUrl, 'Connecting to VSTS', 'continuous-integration/vsts')

      contactingVSTSStatus.send(context, (contactingVSTSStatusResult) => {
        // Retrieve the build defintion from VSTS
        vstsBuild.getDefinition(buildDefinition, project).then((vstsBuildDefinition) => {
          if (vstsBuildDefinition) {
            // Succeded in retrieving the build defintion from VSTS
            let build = {}
            build.definition = vstsBuildDefinition
            build.sourceBranch = context.payload.ref
            build.sourceVersion = context.payload.head_commit.id

            // Queuing a new build within the current definition
            vstsBuild.queueBuild(build, project).then((build) => {
              if (build.id) {
                let pendingStatus = new GitHubStatus(context.payload.head_commit.id, 'pending', build._links.web.href, 'Building', 'continuous-integration/vsts')

                pendingStatus.send(context, (pendingStatusResult) => {
                  if (!pendingStatusResult.data.id) {
                    robot.log.error('Build has been triggered but there was an error while updating the status')
                  }
                })
              } else {
                notifyError(context, buidlDefinintionUrl, 'Failed to queue the VSTS build')
              }
            })
          } else {
            // Failed to retrieve the build definition from VSTS
            notifyError(context, buidlDefinintionUrl, 'Failed to retrieve the VSTS build definition')
          }
        })
      })
    } catch (error) {
      robot.log.error('Failed while processing push event', error)
      // lets try to report the error - might not work based on the error type
      try {
        notifyError(context, '', 'Unknown failure')
      } catch (errorWhileDealingWithError) {
        // There's not much we can do here
        robot.log.error('Failed while managing an error. This really sucks!', errorWhileDealingWithError)
      }
    }
  })

  // Get an express router to expose new HTTP endpoints
  const app = robot.route('/vsts-octobot')

  app.use(require('express').static(path.join(__dirname, '/public')))
  app.use(bodyParser.urlencoded({extended: true}))

  app.post('/buildResult', (req, res) => {
    // TODO: register this URL in VSTS to get the build result
    // TODO: update the commit status
    res.end('buildResult')
  })

  app.get('/auth', (req, res) => {
    res.end('Auth')
  })

  app.get('/setup', (req, res) => {
    let template = viewTemplate.getView('./views/setup.html')
    let installationId = req.query.installation_id
    let view = template.replace('{{installation_id}}', installationId)
    res.end(view)
  })

  app.post('/setup', (req, res) => {
    persistence.set(req.body.installation_id, req.body.token)
    res.end('Setup')
  })

  return app
}
