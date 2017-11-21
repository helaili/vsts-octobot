/* global describe, it, beforeEach */

const expect = require('expect')
const {createRobot} = require('probot')
const app = require('..')
const BuildManager = require('../lib/build-manager')
const PersistenceLayer = require('../lib/persistence-layer')
const buildSucceedMessage = require('./fixtures/buildSucceed.json')
const queuedBuildMessage = require('./fixtures/queuedBuild.json')
const pushMessage = require('./fixtures/push.json')

describe('Build Manager', () => {
  const fernetSecret = 'cw_0x689RpI-jtRR7oE8h_eQsKImvJapLeSbXpwF4e4='
  let robot
  let githubContext
  let persistence = new PersistenceLayer(fernetSecret)

  beforeEach(() => {
    robot = createRobot()
    app(robot)
    persistence = new PersistenceLayer(fernetSecret)

    githubContext = {
      github: {
        repos: {
          createStatus: expect.createSpy().andReturn(Promise.resolve({
            data: {
              id: 1674827256
            }
          }))
        }
      },
      payload: pushMessage
    }

    // Passes the mocked out GitHub API into out robot instance
    robot.auth = () => {
      return Promise.resolve(githubContext.github)
    }
  })

  it('Updates the commit status when the build is successful', async () => {
    persistence.savePayload(queuedBuildMessage, githubContext.payload)
    let buildMngr = new BuildManager(robot)
    const response = await buildMngr.buildCompleted(buildSucceedMessage)
    expect(response).toExist()
    expect(githubContext.github.repos.createStatus).toHaveBeenCalled()
  })
})
