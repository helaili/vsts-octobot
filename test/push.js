/* global describe, beforeEach, it */

const expect = require('expect')
const {createRobot} = require('probot')
const app = require('..')
const payload = require('./payload/push.json')

describe('vsts-octobot', () => {
  let robot
  let github

  beforeEach(() => {
    // Here we create a robot instance
    robot = createRobot()
    // Here we initialize the app on the robot instance
    app(robot)

    // This is an easy way to mock out the GitHub API
    github = {
      repos: {
        createStatus: expect.createSpy().andReturn(Promise.resolve({
          data: {
            id: 1674827256
          }
        }))
      }
    }

    // Passes the mocked out GitHub API into out robot instance
    robot.auth = () => Promise.resolve(github)
  })

  describe('Receiving a push event', () => {
    it('creates a commit status', async () => {
      await robot.receive(payload)
      expect(github.repos.createStatus).toHaveBeenCalled()
    })
  })
})
