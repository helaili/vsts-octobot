const vsts = require('vso-node-api')
const GitHubStatus = require('./github-status')
const PersistenceLayer = require('./persistence-layer')

module.exports = class BuildManager {
  constructor (robot) {
    this.persistence = new PersistenceLayer(process.env.FERNET_SECRET)
    this.robot = robot
  }

  // Update the GitHub status with a failure
  async notifyError (context, buildDefinintionUrl, logMessage) {
    let failingStatus = new GitHubStatus(context.payload.head_commit.id)

    failingStatus.send(context, 'failure', buildDefinintionUrl, logMessage, 'continuous-integration/vsts', (failingStatusResult) => {
      if (!failingStatusResult.data.id) {
        // Something terribly wrong happened
        this.robot.log.error('Failing to send GitHub commit status', failingStatusResult)
      }
    })
  }

  async registerWebHook (installationId, webApi, vstsBuildDefinition) {
    let vstsServiceHookApi = webApi.getServiceHooksApi()
    let subscription = {
      consumerId: 'webHooks',
      consumerActionId: 'httpRequest',
      publisherId: 'tfs',
      eventType: 'build.complete',
      actionDescription: 'Callback to vsts-octobot',
      publisherInputs: {
        definitionName: vstsBuildDefinition.name,
        projectId: vstsBuildDefinition.project.id
      },
      consumerInputs: {
        url: process.env.BASE_URL + '/vsts-octobot/buildResult'
      }
    }
    vstsServiceHookApi.createSubscription(subscription).then((res) => {
      this.persistence.setServiceHookId(installationId, res.id)
    }, (err) => {
      // TODO: Need to find a way to report this to the user
      console.log('Failed to register VSTS webhook', err)
    })
  }

  async build (context) {
    try {
      // Get the VSTS config from the repo
      const config = await context.config('vsts-octobot.yml')
      let instance = config.instance
      let collection = config.collection
      let project = config.project
      let buildDefinitionId = config.buildDefinition

      let collectionUrl = `https://${instance}/${collection}`
      let buildDefinintionUrl = `https://${instance}/${collection}/${project}/_build/index?definitionId=${buildDefinitionId}`

      this.persistence.getInstallation(context.payload.installation.id).then((installation) => {
        let vstsToken = installation.vstsToken

        // Connecting to VSTS Build API
        let authHandler = vsts.getPersonalAccessTokenHandler(vstsToken)
        let webApi = new vsts.WebApi(collectionUrl, authHandler)
        let vstsBuildApi = webApi.getBuildApi()

        // So far so good, let's set the status to pending. Details link is the build definition page
        let githubStatus = new GitHubStatus(context.payload.head_commit.id)

        githubStatus.send(context, 'pending', buildDefinintionUrl, 'Connecting to VSTS', 'continuous-integration/vsts', (contactingVSTSStatusResult) => {
          // Retrieve the build defintion from VSTS
          vstsBuildApi.getDefinition(buildDefinitionId, project).then((vstsBuildDefinition) => {
            if (vstsBuildDefinition) {
              // Succeded in retrieving the build defintion from VSTS

              // Do we already have registered a service hook so we are notified of the build result
              this.persistence.getInstallation(context.payload.installation.id).then((installation) => {
                if (!installation || !installation.serviceHookId) {
                  // Nope, so let's register one
                  this.registerWebHook(context.payload.installation.id, webApi, vstsBuildDefinition)
                }
              })

              let build = {}
              build.definition = vstsBuildDefinition
              build.sourceBranch = context.payload.ref
              build.sourceVersion = context.payload.head_commit.id

              // Queuing a new build within the current definition
              vstsBuildApi.queueBuild(build, project).then((build) => {
                if (build.id) {
                  // Storing the build info and context so we can update the status when VSTS calls back
                  this.persistence.saveContext(build, context)

                  // Let's update the pending status link with a ref to the actual build
                  githubStatus.send(context, 'pending', build._links.web.href, 'Building', 'continuous-integration/vsts', (pendingStatusResult) => {
                    if (!pendingStatusResult.data.id) {
                      this.robot.log.error('Build has been triggered but there was an error while updating the status')
                    }
                  })
                } else {
                  this.notifyError(context, buildDefinintionUrl, 'Failed to queue the VSTS build')
                }
              })
            } else {
              // Failed to retrieve the build definition from VSTS
              this.notifyError(context, buildDefinintionUrl, 'Failed to retrieve the VSTS build definition')
            }
          })
        })
      }, (installionRetrievalError) => {
        // TODO: Manage this error
      })
    } catch (error) {
      this.robot.log.error('Failed while processing push event', error)
      // lets try to report the error - might not work based on the error type
      try {
        this.notifyError(context, '', 'Unknown failure')
      } catch (errorWhileDealingWithError) {
        // There's not much we can do here
        this.robot.log.error('Failed while managing an error. This really sucks!', errorWhileDealingWithError)
      }
    }
  }
}