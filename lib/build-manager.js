const VSTSWebApi = require('./vsts-api')
const GitHubStatus = require('./github-status')
const PersistenceLayer = require('./persistence-layer')
const Context = require('probot/lib/context')

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
    webApi.createSubscription(subscription).then((res) => {
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

      let buildDefinintionUrl = `https://${instance}/${collection}/${project}/_build/index?definitionId=${buildDefinitionId}`

      this.persistence.getInstallation(context.payload.installation.id).then((installation) => {
        let vstsToken = installation.vstsToken

        // Connecting to VSTS Build API
        let webApi = new VSTSWebApi(`https://${instance}/`, collection, vstsToken, this.robot.log)

        // So far so good, let's set the status to pending. Details link is the build definition page
        let githubStatus = new GitHubStatus(context.payload.head_commit.id)

        githubStatus.send(context, 'pending', buildDefinintionUrl, 'Connecting to VSTS', 'continuous-integration/vsts', (contactingVSTSStatusResult) => {
          // Retrieve the build defintion from VSTS
          webApi.getDefinition(buildDefinitionId, project).then((vstsBuildDefinition) => {
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
              webApi.queueBuild(build, project).then((build) => {
                if (build.id) {
                  // Storing the build info and context so we can update the status when VSTS calls back
                  this.persistence.savePayload(build, context.payload)

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
        // TODO: Manage this error - the end user should know there is something wrong with their installation
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

  async buildCompleted (buildMessage) {
    return new Promise((resolve, reject) => {
      this.persistence.getPayload(buildMessage.resource.project.id, buildMessage.resource.definition.id, buildMessage.resource.buildNumber).then((context) => {
        if (context) {
          this.robot.log.info('Received a callback for build:', buildMessage.resource.project.id, buildMessage.resource.definition.id, buildMessage.resource.buildNumber)
          let result = buildMessage.resource.result

          // Retrive an authenticated GitHub client
          this.robot.auth(context.payload.installation.id).then((github) => {
            // Create a fresh probot context object
            let probotContext = new Context({payload: context.payload}, github)
            let buildStatus = new GitHubStatus(context.payload.head_commit.id)
            let status

            if (result === 'succeeded') {
              status = 'success'
            } else if (result === 'failed' || result === 'canceled' || result === 'partiallySucceeded') {
              status = 'failure'
            } else { // buildStatus=none
              status = 'error'
            }

            buildStatus.send(probotContext, status, context.link, result, 'continuous-integration/vsts', (buildStatusResult) => {
              if (!buildStatusResult.data.id) {
                // Something terribly wrong happened
                this.robot.log.error('Failing to send GitHub commit status', buildStatusResult)
                reject(buildStatusResult)
              } else {
                resolve(buildStatusResult)
              }
            })
          })
        } else {
          this.robot.log.warn('Received a callback for an unknown build:', buildMessage.resource.project.id, buildMessage.resource.definition.id, buildMessage.resource.buildNumber)
          resolve({message: 'unknown build'})
        }
      }, (error) => {
        this.robot.log.error('Error while retrieving build', error)
        reject(error)
      })
    })
  }
}
