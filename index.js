var path = require('path')

module.exports = (robot) => {
  console.log('Yay, the app was loaded!')
  robot.on('push', async context => {
    let statusData = context.issue({
      sha: context.payload.head_commit.id,
      state: 'pending',
      target_url: 'https://github.com',
      description: 'Building...',
      context: 'continuous-integration/vsts'
    })

    try {
      context.github.repos.createStatus(statusData).then((status) => {
        if (status.data.id) {
          /*
          let instance = 'helaili.visualstudio.com'
          let collection = 'DefaultCollection'
          let project = 'ReadingTime'
          let version = '2.O'
          let buildURL = `https://${instance}/${collection}/${project}/_apis/build/builds?api-version=${version}`
          */
          // TODO: Queue the build in vsts. Is there a VSTS API JS client?
          // TODO: Retrieve the new target url
          console.log('yiiihaaaa')
        } else {
          // Something terribly wrong happened
          console.error('Did not get a status id back from GitHub while using ', statusData, 'Result was ', status)
        }
      })
    } catch (error) {
      console.error('Failed while processing push event', error)
      // lets try to report the error - might not work based on the error type
      try {
        let errorStatusData = context.issue({
          sha: context.payload.head_commit.id,
          state: 'failure',
          description: error.message,
          context: 'continuous-integration/vsts'
        })
        context.github.repos.createStatus(errorStatusData)
      } catch (errorWhileDealingWithError) {
        // There's not much we can do here
      }
    }
  })

  // Get an express router to expose new HTTP endpoints
  const app = robot.route('/vsts-octobot')

  // Use any middleware
  app.use(require('express').static(path.join(__dirname, '/public')))

  app.post('/buildResult', (req, res) => {
    // TODO: register this URL in VSTS to get the build result
    // TODO: update the commit status
    res.end('buildResult')
  })

  app.get('/home', (req, res) => {
    res.end('Home')
  })

  app.get('/auth', (req, res) => {
    res.end('Auth')
  })

  app.get('/setup', (req, res) => {
    res.end('Setup')
  })
}
